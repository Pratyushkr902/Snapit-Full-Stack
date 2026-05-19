import axios from "axios";
import SummaryApi from "../common/SummaryApi";

const API_URL = "https://snapit-full-stack-2.onrender.com";

const Axios = axios.create({
    baseURL: API_URL,
    withCredentials: true
});

// Queue variables to completely block parallel overlapping token refresh loops
let isRefreshing = false;
let refreshSubscribers = [];

// Helper utility to notify all stalled parallel API calls when the new token arrives
const onTokenRefreshed = (newAccessToken) => {
    refreshSubscribers.map((callback) => callback(newAccessToken));
    refreshSubscribers = [];
};

// Queue wrapper to hold onto requests while token is actively renewing
const addRefreshSubscriber = (callback) => {
    refreshSubscribers.push(callback);
};

// Send access token in header
Axios.interceptors.request.use(
    async (config) => {
        const accessToken = localStorage.getItem('accesstoken') || localStorage.getItem('accessToken');
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

            // If a token swap is ALREADY in flight, pause this request and queue it up
            if (isRefreshing) {
                return new Promise((resolve) => {
                    addRefreshSubscriber((newAccessToken) => {
                        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                        resolve(Axios(originalRequest));
                    });
                });
            }

            // Lock the thread state — we are officially renewing the key right now
            isRefreshing = true;

            try {
                // FIXED: Use custom instance architecture instead of unconfigured vanilla axios
                const refreshResponse = await Axios({
                    method: SummaryApi.refreshToken.method,
                    url: `${SummaryApi.refreshToken.url}`, // Relative URL handles context securely
                    headers: { Authorization: `Bearer ${refreshToken}` },
                    _retry: true // Prevents this custom endpoint call from recursively checking itself
                });

                const newAccessToken = refreshResponse.data.data.accessToken;

                // Enforce strictly lowercase across operations
                localStorage.setItem('accesstoken', newAccessToken);
                localStorage.removeItem('accessToken');

                // Release the lock and fire off all stacked parallel queue requests waiting on line
                isRefreshing = false;
                onTokenRefreshed(newAccessToken);

                // Process the current request that originally triggered this fix loop
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
    // Native multi-environment fallback verification window routing check
    if (typeof window !== "undefined") {
        window.location.href = "/login";
    }
};

export default Axios;