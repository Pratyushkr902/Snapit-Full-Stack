import axios from "axios";
import SummaryApi from "../common/SummaryApi";

const API_URL = "https://snapit-full-stack-0.onrender.com";

const Axios = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

let isRefreshing = false;
let refreshSubscribers = [];

const onTokenRefreshed = (newAccessToken) => {
    refreshSubscribers.forEach((callback) => callback(newAccessToken));
    refreshSubscribers = [];
};

const addRefreshSubscriber = (callback) => {
    refreshSubscribers.push(callback);
};

// Send access token in header
Axios.interceptors.request.use(
    async (config) => {
        // ✅ FIXED: Enforces an airtight uniform fallback verification strategy to prevent token dropouts
        const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('accesstoken');
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Auto-refresh on 401 with overlapping queue control mechanics
Axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const { config, response } = error;
        const originalRequest = config;

        if (response && response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const refreshToken = localStorage.getItem("refreshToken");
            if (!refreshToken) {
                handleLogoutRedirect();
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise((resolve) => {
                    addRefreshSubscriber((newAccessToken) => {
                        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                        resolve(Axios(originalRequest));
                    });
                });
            }

            isRefreshing = true;

            try {
                // ✅ FIXED: Using direct un-intercepted vanilla axios call to prevent request interceptor configuration stripping
                const refreshResponse = await axios({
                    method: SummaryApi.refreshToken.method || 'post',
                    url: `${API_URL}${SummaryApi.refreshToken.url}`,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${refreshToken}` 
                    },
                    withCredentials: true
                });

                const newAccessToken = refreshResponse.data?.data?.accessToken;

                if (!newAccessToken) throw new Error("Token allocation string missing");

                // ✅ FIXED: Enforce a single standard uniform key syntax to preserve login profile integrity
                localStorage.setItem('accessToken', newAccessToken);
                localStorage.setItem('accesstoken', newAccessToken);

                isRefreshing = false;
                onTokenRefreshed(newAccessToken);

                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return Axios(originalRequest);

            } catch (refreshError) {
                isRefreshing = false;
                refreshSubscribers = [];
                console.error("Refresh Token Expired or Invalidated", refreshError);
                handleLogoutRedirect();
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

const handleLogoutRedirect = () => {
    localStorage.clear();
    if (typeof window !== "undefined") {
        window.location.href = "/login";
    }
};

export default Axios;