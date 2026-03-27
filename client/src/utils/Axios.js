import axios from "axios";
import SummaryApi, { baseURL } from "../common/SummaryApi";

// Production URL Fix
const API_URL = "https://snapit-full-stack.onrender.com";

const Axios = axios.create({
    baseURL : API_URL,
    withCredentials : true
})

// Sending access token in the header
Axios.interceptors.request.use(
    async(config)=>{
        // Fix: Case-sensitive check for 'accessToken'
        const accessToken = localStorage.getItem('accesstoken')

        if(accessToken){
            config.headers.Authorization = `Bearer ${accessToken}`
        }

        return config
    },
    (error)=>{
        return Promise.reject(error)
    }
)

// Extend the life span of access token with the help of refresh
Axios.interceptors.response.use(
    (response)=>{
        return response
    },
    async(error)=>{
        let originRequest = error.config 

        // If 401 and we haven't retried yet
        if(error.response && error.response.status === 401 && !originRequest._retry){
            originRequest._retry = true // Fixed: using _retry convention

            const refreshToken = localStorage.getItem("refreshToken")

            if(refreshToken){
                const newAccessToken = await refreshAccessToken(refreshToken)

                if(newAccessToken){
                    // Update the header and retry the original request
                    originRequest.headers.Authorization = `Bearer ${newAccessToken}`
                    return Axios(originRequest)
                }
            }
        }
        
        return Promise.reject(error)
    }
)

// FIX: Use a basic axios instance here to avoid infinite interceptor loops
const refreshAccessToken = async(refreshToken)=>{
    try {
        const response = await axios({
            method: SummaryApi.refreshToken.method,
            url: `${API_URL}${SummaryApi.refreshToken.url}`,
            headers : {
                Authorization : `Bearer ${refreshToken}`
            },
            withCredentials: true
        })

        const accessToken = response.data.data.accessToken
        localStorage.setItem('accesstoken', accessToken)
        return accessToken
    } catch (error) {
        // If refresh fails, clear everything and force logout
        console.log("Refresh Token Expired", error)
        localStorage.clear()
        window.location.href = "/login"
    }
}

export default Axios