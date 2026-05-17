import axios from "axios";
import SummaryApi from "../common/SummaryApi";

const API_URL = "https://snapit-full-stack-2.onrender.com";

// ─── Storage helpers (single source of truth for key names) ──────────────────
// Always use lowercase throughout the app. Helpers also clean up old
// capitalised variants written by earlier versions of the code.
const TOKEN_KEY   = 'accesstoken'
const REFRESH_KEY = 'refreshtoken'

export const getAccessToken  = () => localStorage.getItem(TOKEN_KEY)
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY)

export const setAccessToken = (token) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.removeItem('accessToken')   // remove stale capitalised variant
}

export const setRefreshToken = (token) => {
    localStorage.setItem(REFRESH_KEY, token)
    localStorage.removeItem('refreshToken')  // remove stale capitalised variant
}

export const clearTokens = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
}
// ─────────────────────────────────────────────────────────────────────────────

const Axios = axios.create({
    baseURL: API_URL,
    withCredentials: true
})

// ── Request interceptor: attach access token ──────────────────────────────────
Axios.interceptors.request.use(
    (config) => {
        const accessToken = getAccessToken()
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// ── Response interceptor: auto-refresh on 401 ────────────────────────────────
let isRefreshing = false
let failedQueue  = []   // requests that arrived while a refresh was in-flight

const processQueue = (error, token = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error)
        else       resolve(token)
    })
    failedQueue = []
}

Axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
            const refreshToken = getRefreshToken()

            // No refresh token — bail out immediately
            if (!refreshToken) {
                clearTokens()
                window.location.href = "/login"
                return Promise.reject(error)
            }

            if (isRefreshing) {
                // Queue this request until the ongoing refresh completes
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`
                    return Axios(originalRequest)
                }).catch((err) => Promise.reject(err))
            }

            originalRequest._retry = true
            isRefreshing = true

            try {
                const newAccessToken = await refreshAccessToken(refreshToken)
                processQueue(null, newAccessToken)
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
                return Axios(originalRequest)
            } catch (refreshError) {
                processQueue(refreshError, null)
                clearTokens()
                window.location.href = "/login"
                return Promise.reject(refreshError)
            } finally {
                isRefreshing = false
            }
        }

        return Promise.reject(error)
    }
)

// ── Refresh helper (plain axios to avoid interceptor loop) ────────────────────
const refreshAccessToken = async (refreshToken) => {
    try {
        const response = await axios({
            method: SummaryApi.refreshToken.method,
            url:    `${API_URL}${SummaryApi.refreshToken.url}`,
            headers: { Authorization: `Bearer ${refreshToken}` },
            withCredentials: true
        })

        const newAccessToken = response.data?.data?.accessToken
        if (!newAccessToken) throw new Error("No access token in refresh response")

        setAccessToken(newAccessToken)
        return newAccessToken
    } catch (error) {
        console.error("Token refresh failed:", error)
        throw error  // Let the interceptor handle redirect + clearTokens
    }
}

export default Axios