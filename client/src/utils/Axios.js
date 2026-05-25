import axios from "axios";
import SummaryApi from "../common/SummaryApi";

const API_URL = "https://snapit-full-stack-2.onrender.com";

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

Axios.interceptors.request.use(
    async (config) => {
        // ✅ FIX: Cross-platform fallback search mapping both string schemas
        const accessToken = localStorage.getItem('accesstoken') || localStorage.getItem('accessToken');
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

Axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const { config, response } = error;
        const originalRequest = config;

        if (response && response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // ✅ FIX: Cross-platform fallback lookups for mobile token refresh
            const refreshToken = localStorage.getItem("refreshToken") || localStorage.getItem("refreshtoken");
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
                const refreshUrl = SummaryApi.refreshToken.url.startsWith('http')
                    ? SummaryApi.refreshToken.url
                    : `${API_URL}${SummaryApi.refreshToken.url.startsWith('/') ? '' : '/'}${SummaryApi.refreshToken.url}`;

                const refreshResponse = await axios({
                    method: 'post',
                    url: refreshUrl,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${refreshToken}`
                    },
                    withCredentials: true
                });

                const newAccessToken = refreshResponse.data?.data?.accesstoken 
                    || refreshResponse.data?.data?.accessToken;

                if (!newAccessToken) throw new Error("No access token in refresh response");

                // ✅ FIX: Store it in both lowercase and camelCase variations to protect cross-runtime modules
                localStorage.setItem('accesstoken', newAccessToken);
                localStorage.setItem('accessToken', newAccessToken);

                isRefreshing = false;
                onTokenRefreshed(newAccessToken);

                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return Axios(originalRequest);

            } catch (refreshError) {
                isRefreshing = false;
                refreshSubscribers = [];
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
        window.location.hash = "#/login";
    }
};

export default Axios;