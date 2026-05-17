import axios from "axios";
import SummaryApi, { baseURL } from "../common/SummaryApi";

const API_URL = "https://snapit-full-stack-2.onrender.com";

const Axios = axios.create({
    baseURL : API_URL,
    withCredentials : true
})

// Send access token in header
Axios.interceptors.request.use(
    async(config) => {
        // Prefer lowercase accesstoken — avoids stale capital-T token bug
        const accessToken = localStorage.getItem('accesstoken') || localStorage.getItem('accessToken');
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
)

// Auto-refresh on 401
Axios.interceptors.response.use(
    (response) => response,
    async(error) => {
        let originRequest = error.config
        if (error.response && error.response.status === 401 && !originRequest._retry) {
            originRequest._retry = true
            const refreshToken = localStorage.getItem("refreshToken")
            if (refreshToken) {
                const newAccessToken = await refreshAccessToken(refreshToken)
                if (newAccessToken) {
                    originRequest.headers.Authorization = `Bearer ${newAccessToken}`
                    return Axios(originRequest)
                }
            }
        }
        return Promise.reject(error)
    }
)

const refreshAccessToken = async(refreshToken) => {
    try {
        const response = await axios({
            method: SummaryApi.refreshToken.method,
            url: `${API_URL}${SummaryApi.refreshToken.url}`,
            headers: { Authorization: `Bearer ${refreshToken}` },
            withCredentials: true
        })
        const accessToken = response.data.data.accessToken
        // FIXED: Only store lowercase — no duplicate stale token
        localStorage.setItem('accesstoken', accessToken)
        // Clean up capital-T version if it exists
        localStorage.removeItem('accessToken')
        return accessToken
    } catch (error) {
        console.log("Refresh Token Expired", error)
        localStorage.clear()
        window.location.href = "/login"
    }
}

export default Axios;