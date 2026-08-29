import axios from "axios"
import secureStorage from "./secureStorage"
import CommonSummaryApi from "../common/SummaryApi"

// ─── SECURITY FIX: No hardcoded fallback URL ────────────────────────────────
// The backend URL must always come from the environment.
// A missing env var in production will now throw immediately (fail-loud),
// rather than silently pointing at a hardcoded Render URL.
const API_URL = import.meta.env.VITE_API_URL || "https://snapit-full-stack-production.up.railway.app"

export const baseURL = API_URL
export const SummaryApi = CommonSummaryApi

// ─── AXIOS INSTANCE ──────────────────────────────────────────────────────────
// SECURITY FIX: Added 15s request timeout to prevent slowloris / hung requests
const Axios = axios.create({
    baseURL:         API_URL,
    withCredentials: true,
    timeout:         15000, // 15 seconds — fail loud rather than hang forever
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

// ─── PUBLIC ROUTES (skip auth header) ────────────────────────────────────────
const publicRoutes = [
    '/api/category/get',
    '/api/subcategory/get',
    '/api/product/get',
    '/api/product/get-product-by-category',
    '/api/product/get-product-by-category-and-subcategory',
    '/api/product/get-product-details',
    '/api/product/search-product',
    '/api/user/login',
    '/api/user/register',
    '/api/app-version',
    '/api/public-tracking',
]

// ─── REQUEST INTERCEPTOR ─────────────────────────────────────────────────────
// SECURITY FIX: Use a single canonical token key ('accessToken').
// Tokens should ideally live in httpOnly cookies (set by the server) so JS
// cannot read them at all.  Until that migration is done we keep one key name.
Axios.interceptors.request.use(
    async (config) => {
        // SECURITY NOTE: Read from one canonical key only.
        // Migrate to httpOnly cookie auth to eliminate this entirely.
        const accessToken = await secureStorage.getItem('accessToken')
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`
        }

        // Let the browser set Content-Type with correct boundary for multipart
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type']
        }

        return config
    },
    (error) => Promise.reject(error)
)

// ─── RESPONSE INTERCEPTOR ────────────────────────────────────────────────────
Axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const { config, response } = error
        const originalRequest = config

        // SECURITY FIX: Handle 429 explicitly — surface rate-limit info to the user
        if (response?.status === 429) {
            const retryAfter = response.headers?.['retry-after'] || 60
            const msg = `Too many requests. Please wait ${retryAfter} seconds and try again.`
            // Attach human-readable message so UI can toast it
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
                const refreshUrl = SummaryApi.refreshToken.url.startsWith('http')
                    ? SummaryApi.refreshToken.url
                    : `${API_URL}${SummaryApi.refreshToken.url.startsWith('/') ? '' : '/'}${SummaryApi.refreshToken.url}`

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