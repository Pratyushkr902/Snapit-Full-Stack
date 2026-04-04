import axios from "axios";
import SummaryApi, { baseURL } from "../common/SummaryApi";

// PRODUCTION URL FIX: Using the stable -0 instance to match your backend
const API_URL = "https://snapit-full-stack-0.onrender.com";

const Axios = axios.create({
    baseURL : API_URL,
    withCredentials : true
})

// Sending access token in the header - FIXED for Android & Desktop
Axios.interceptors.request.use(
    async(config)=>{
        // FIXED: Standardized case-sensitivity to match common login logic
        const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('accesstoken');

        if(accessToken){
            config.headers.Authorization = `Bearer ${accessToken}`;
        }

        return config;
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
        let originRequest = error.config; 

        // If 401 (Unauthorized) and we haven't retried yet
        if(error.response && error.response.status === 401 && !originRequest._retry){
            originRequest._retry = true;

            const refreshToken = localStorage.getItem("refreshToken");

            if(refreshToken){
                const newAccessToken = await refreshAccessToken(refreshToken);

                if(newAccessToken){
                    // Update the header and retry the original request
                    originRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return Axios(originRequest);
                }
            }
        }
        
        return Promise.reject(error);
    }
)

/**
 * REFRESH TOKEN LOGIC
 * FIXED: Uses a fresh axios instance to prevent recursive interceptor loops
 */
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

        // Standardize token storage
        const accessToken = response.data.data.accessToken;
        localStorage.setItem('accessToken', accessToken); 
        localStorage.setItem('accesstoken', accessToken); // Legacy fallback
        
        return accessToken;
    } catch (error) {
        // If refresh fails, clear everything and force logout
        console.error("Refresh Token Expired or Invalid", error);
        localStorage.clear();
        // window.location.href = "/login"; // Optional: keep commented during debug
    }
}

export default Axios;