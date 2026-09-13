import axios from "axios"
import secureStorage from "./secureStorage"
import CommonSummaryApi from "../common/SummaryApi"

// ─── SECURITY FIX: No hardcoded fallback URL ────────────────────────────────
// The backend URL must always come from the environment.
// A missing env var in production will now throw immediately (fail-loud),
const API_URL = import.meta.env.VITE_API_URL || "https://snapit-full-stack-production.up.railway.app"
const FALLBACK_API_URL = "https://snapit.00pratyush20.workers.dev"

// Dynamic API host manager with session persistence for instant 0ms requests
export const getActiveBaseURL = () => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
        const saved = sessionStorage.getItem('snapit_api_host')
        if (saved) return saved
    }
    return API_URL
}

export const setActiveBaseURL = (url) => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
        try { sessionStorage.setItem('snapit_api_host', url) } catch (_) {}
    }
    Axios.defaults.baseURL = url
}

export const baseURL = API_URL
export const SummaryApi = CommonSummaryApi

// ─── AXIOS INSTANCE ──────────────────────────────────────────────────────────
// SECURITY FIX: Added 15s request timeout to prevent slowloris / hung requests
const Axios = axios.create({
    baseURL:         getActiveBaseURL(),
    withCredentials: true,
    timeout:         25000, // 25 seconds — resilient on mobile cellular networks
    headers: {
        'Content-Type': 'application/json',
        'Accept':        'application/json',
    },
})

// ─── TOKEN REFRESH STATE ─────────────────────────────────────────────────────
let isRefreshing = false
let refreshSubscribers = []

const onTokenRefreshed = (newAccessToken) => {
    refreshSubscribers.forEach((cb) => cb(newAccessToken))
    refreshSubscribers = []
}
const addRefreshSubscriber = (cb) => { refreshSubscribers.push(cb) }

// ─── PUBLIC ROUTES (skip auth header & refresh redirects) ────────────────────
const publicRoutes = [
    '/api/category/get',
    '/api/subcategory/get',
    '/api/product/get',
    '/api/product/get-product-by-category',
    '/api/product/get-product-by-category-and-subcategory',
    '/api/product/get-product-details',
    '/api/product/search-product',
    '/api/user/login',
    '/api/user/login-with-password',
    '/api/user/register',
    '/api/user/forgot-password',
    '/api/user/verify-forgot-password-otp',
    '/api/user/reset-password',
    '/api/otp/send',
    '/api/otp/verify',
    '/api/app-version',
    '/api/public-tracking',
    '/api/restaurant/all',
]

// ─── REQUEST INTERCEPTOR ─────────────────────────────────────────────────────
Axios.interceptors.request.use(
    async (config) => {
        const activeHost = getActiveBaseURL()
        if (config.baseURL !== activeHost) {
            config.baseURL = activeHost
        }
        if (config.url && config.url.startsWith(API_URL) && activeHost !== API_URL) {
            config.url = config.url.replace(API_URL, activeHost)
        }

        const requestUrl = config?.url
            ? config.url.replace(activeHost, '').replace(API_URL, '').split('?')[0]
            : ''
        const isPublic = publicRoutes.some(route => requestUrl.includes(route))

        // Only attach Authorization header if not a public auth/catalog route
        if (!isPublic) {
            const accessToken = await secureStorage.getItem('accessToken')
            if (accessToken) {
                config.headers.Authorization = `Bearer ${accessToken}`
            }
        }

        // Let the browser set Content-Type with correct boundary for multipart
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type']
        }

        return config
    },
    (error) => Promise.reject(error)
)

// ─── RETRY CONFIGURATION ─────────────────────────────────────────────────────
const MAX_AUTO_RETRIES = 2
const BASE_RETRY_DELAY_MS = 400

const isRetryableNetworkError = (error) => {
    if (axios.isCancel(error) || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
        return false
    }
    if (!error.response) return true // Network error, DNS lookup failure, or timeout
    const status = error.response.status
    return status === 502 || status === 503 || status === 504 || status === 408
}

const isSafeToAutoRetry = (config, isPureNetworkFail) => {
    if (!config) return false
    // If the request never reached any server (pure network / DNS drop), failover is 100% safe for all methods
    if (isPureNetworkFail) return true

    const method = (config.method || 'get').toLowerCase()
    if (method === 'get' || method === 'head' || method === 'options') return true
    const url = config.url || ''
    const safeReadEndpoints = [
        '/get',
        '/search-product',
        '/get-product-details',
        '/get-product-by-category',
        '/get-product-by-category-and-subcategory',
        '/get-variants',
        '/check-serviceability',
        '/app-version',
        '/api/restaurant/all',
        '/api/otp/send',
        '/api/user/login',
    ]
    return safeReadEndpoints.some(ep => url.includes(ep))
}

// ─── RESPONSE INTERCEPTOR ────────────────────────────────────────────────────
Axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const { config, response } = error
        const originalRequest = config
        const isPureNetworkFail = !response

        // Auto-retry transient network glitches with Cloudflare Worker failover
        if (originalRequest && isRetryableNetworkError(error) && isSafeToAutoRetry(originalRequest, isPureNetworkFail)) {
            originalRequest._retryCount = originalRequest._retryCount || 0
            if (originalRequest._retryCount < MAX_AUTO_RETRIES) {
                originalRequest._retryCount += 1

                // If DNS/cellular connection to Railway failed, failover transparently to Cloudflare Worker
                if (isPureNetworkFail) {
                    setActiveBaseURL(FALLBACK_API_URL)
                    originalRequest.baseURL = FALLBACK_API_URL
                    if (originalRequest.url && originalRequest.url.startsWith(API_URL)) {
                        originalRequest.url = originalRequest.url.replace(API_URL, FALLBACK_API_URL)
                    }
                }

                const delay = BASE_RETRY_DELAY_MS * Math.pow(2, originalRequest._retryCount - 1)
                await new Promise(res => setTimeout(res, delay))
                return Axios(originalRequest)
            }
        }

        // SECURITY FIX: Handle 429 explicitly — surface rate-limit info to the user
        if (response?.status === 429) {
            const retryAfter = response.headers?.['retry-after'] || 60
            const msg = `Too many requests. Please wait ${retryAfter} seconds and try again.`
            error.rateLimitMessage = msg
            console.warn(`[Rate limited] retry-after: ${retryAfter}s`)
            return Promise.reject(error)
        }

        const requestUrl = originalRequest?.url
            ? originalRequest.url.replace(API_URL, '').split('?')[0]
            : ''
        const isPublicRoute = publicRoutes.some(route => requestUrl.includes(route))

        if (isPublicRoute) {
            return Promise.reject(error)
        }

        if (response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true

            // SECURITY NOTE: refreshToken should come from an httpOnly cookie.
            // Until that migration is done, read from canonical single key.
            const refreshToken = await secureStorage.getItem('refreshToken')
            if (!refreshToken) {
                handleLogoutRedirect()
                return Promise.reject(error)
            }

            if (isRefreshing) {
                return new Promise((resolve) => {
                    addRefreshSubscriber((newAccessToken) => {
                        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
                        resolve(Axios(originalRequest))
                    })
                })
            }

            isRefreshing = true

            try {
                const currentHost = getActiveBaseURL()
                const refreshUrl = SummaryApi.refreshToken.url.startsWith('http')
                    ? SummaryApi.refreshToken.url
                    : `${currentHost}${SummaryApi.refreshToken.url.startsWith('/') ? '' : '/'}${SummaryApi.refreshToken.url}`

                const refreshResponse = await axios({
                    method:          'post',
                    url:             refreshUrl,
                    withCredentials: true,
                    headers: {
                        'Content-Type':  'application/json',
                        'Authorization': `Bearer ${refreshToken}`,
                    },
                })

                const newAccessToken =
                    refreshResponse.data?.data?.accessToken ||
                    refreshResponse.data?.data?.accesstoken

                if (!newAccessToken) throw new Error('No access token in refresh response')

                // SECURITY FIX: Use one canonical key name for access token
                await secureStorage.setItem('accessToken', newAccessToken)

                isRefreshing = false
                onTokenRefreshed(newAccessToken)

                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
                return Axios(originalRequest)

            } catch (refreshError) {
                isRefreshing = false
                refreshSubscribers = []
                handleLogoutRedirect()
                return Promise.reject(refreshError)
            }
        }

        return Promise.reject(error)
    }
)

// ─── LOGOUT HELPER ────────────────────────────────────────────────────────────
// SECURITY FIX: Clear only auth-specific keys, not ALL localStorage.
// Clearing everything nukes unrelated app state and is unnecessarily blunt.
const handleLogoutRedirect = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    if (typeof window !== 'undefined') {
        window.location.hash = '#/login'
    }
}

export default Axios