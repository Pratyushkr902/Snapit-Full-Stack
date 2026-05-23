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
        const accessToken = localStorage.getItem('accesstoken');
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
                // Ensure the URL is clean and safe from duplication
                const refreshUrl = SummaryApi.refreshToken.url.startsWith('http')
                    ? SummaryApi.refreshToken.url
                    : `${API_URL}${SummaryApi.refreshToken.url.startsWith('/') ? '' : '/'}${SummaryApi.refreshToken.url}`;

                const refreshResponse = await axios({
                    method: 'post',
                    url: refreshUrl, // ✓ Normalized string variable
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${refreshToken}`
                    },
                    withCredentials: true
                });

                // Handle variations of key names for access token string
                const newAccessToken = refreshResponse.data?.data?.accesstoken 
                    || refreshResponse.data?.data?.accessToken;

                if (!newAccessToken) throw new Error("No access token in refresh response");

                localStorage.setItem('accesstoken', newAccessToken);

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