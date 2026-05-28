import axios from "axios";

// ✅ CRITICAL FIXED DOMAIN TARGET: 
const API_URL = import.meta.env.VITE_API_URL || "https://snapit-full-stack-2.onrender.com";
// =========================================================================
// 1. CENTRALIZED API ROUTE DICTIONARY WITH WALLET & SUBSCRIPTION MAPPINGS
// =========================================================================
export const baseURL = API_URL;

export const SummaryApi = {
    register: { url: '/api/user/register', method: 'post' },
    login: { url: '/api/user/login', method: 'post' },
    forgot_password: { url: "/api/user/forgot-password", method: 'put' },
    forgot_password_otp_verification: { url: '/api/user/verify-forgot-password-otp', method: 'put' },
    resetPassword: { url: "/api/user/reset-password", method: 'put' },
    refreshToken: { url: '/api/user/refresh-token', method: 'post' },
    userDetails: { url: '/api/user/user-details', method: 'get' },
    logout: { url: "/api/user/logout", method: 'get' },
    uploadAvatar: { url: "/api/user/upload-avatar", method: 'put' },
    updateUserDetails: { url: '/api/user/update-user', method: 'put' },
    getRiders: { url: '/api/user/all-riders', method: 'get' },
    saveFcmToken: { url: '/api/user/save-fcm-token', method: 'post' },
    
    addCategory: { url: '/api/category/add-category', method: 'post' },
    uploadImage: { url: '/api/file/upload', method: 'post' },
    getCategory: { url: '/api/category/get', method: 'get' },
    updateCategory: { url: '/api/category/update', method: 'put' },
    deleteCategory: { url: '/api/category/delete', method: 'delete' },
    
    createSubCategory: { url: '/api/subcategory/create', method: 'post' },
    getSubCategory: { url: '/api/subcategory/get', method: 'post' },
    updateSubCategory: { url: '/api/subcategory/update', method: 'put' },
    deleteSubCategory: { url: '/api/subcategory/delete', method: 'delete' },
    
    createProduct: { url: '/api/product/create', method: 'post' },
    getProduct: { url: '/api/product/get', method: 'post' },
    getProductByCategory: { url: '/api/product/get-product-by-category', method: 'post' },
    getProductByCategoryAndSubCategory: { url: '/api/product/get-product-by-category-and-subcategory', method: 'post' },
    getProductDetails: { url: '/api/product/get-product-details', method: 'post' },
    updateProductDetails: { url: "/api/product/update-product-details", method: 'put' },
    deleteProduct: { url: "/api/product/delete-product", method: 'delete' },
    searchProduct: { url: '/api/product/search-product', method: 'post' },
    
    addTocart: { url: "/api/cart/create", method: 'post' },
    getCartItem: { url: '/api/cart/get', method: 'get' },
    updateCartItemQty: { url: '/api/cart/update-qty', method: 'put' },
    deleteCartItem: { url: '/api/cart/delete-cart-item', method: 'delete' },
    
    createAddress: { url: '/api/address/create', method: 'post' },
    getAddress: { url: '/api/address/get', method: 'get' },
    updateAddress: { url: '/api/address/update', method: 'put' },
    disableAddress: { url: '/api/address/disable', method: 'delete' },
    
    CashOnDeliveryOrder: { url: "/api/order/cash-on-delivery", method: 'post' },
    payment_url: { url: "/api/order/checkout", method: 'post' },
    getOrderItems: { url: '/api/order/order-items', method: 'get' },
    getSellerOrders: { url: '/api/order/seller-orders', method: 'get' },
    getRiderLocation: { url: '/api/order/get-rider-location', method: 'post' },
    updateOrderStatus: { url: '/api/order/update-status', method: 'put' },
    updateSellerStatus: { url: '/api/order/update-seller-status', method: 'post' },
    
    getNearestStore: { url: '/api/store/nearest', method: 'post' },
    updateStoreInventory: { url: '/api/product/update-store-stock', method: 'put' },
    addStore: { url: '/api/store/add', method: 'post' },
    settleCash: { url: '/api/order/settle-cash', method: 'post' },
    getDailyReport: { url: '/api/order/daily-report', method: 'get' },
    getLastOrder: { url: '/api/order/last-order', method: 'get' },
    getFrequentlyBought: { url: '/api/product/frequently-bought', method: 'get' },
    
    addReview: { url: '/api/review/add', method: 'post' },
    getReviews: { url: '/api/review/get', method: 'post' },
    deleteReview: { url: '/api/review/delete', method: 'delete' },
    toggleWishlist: { url: '/api/review/wishlist/toggle', method: 'post' },
    getWishlist: { url: '/api/review/wishlist/get', method: 'get' },
    applyFirstTimeCoupon: { url: '/api/order/coupon/apply', method: 'post' },
    getReferralInfo: { url: '/api/referral/info', method: 'get' },
    applyFirstOrderBonus: { url: '/api/referral/first-order-bonus', method: 'post' },

    getWallet: { url: '/api/wallet/get', method: 'get' },
    addMoneyToWallet: { url: '/api/wallet/add-money', method: 'post' },
    payWithWallet: { url: '/api/wallet/pay', method: 'post' },

    getUserSubscriptions: { url: '/api/subscription/get', method: 'get' },
    updateSubscriptionStatus: { url: '/api/subscription/update-status', method: 'put' },
    cancelSubscription: { url: '/api/subscription/cancel', method: 'delete' }
};

// =========================================================================
// 2. GLOBAL INSTANCE CONFIGURATION & CROSS-PLATFORM INTERCEPTORS
// =========================================================================
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

const publicRoutes = [
    '/api/category/get',
    '/api/subcategory/get',
    '/api/product/get',
    '/api/product/get-product-by-category',
    '/api/product/get-product-by-category-and-subcategory',
    '/api/product/get-product-details',
    '/api/product/search-product',
    '/api/user/login',
    '/api/user/register'
];

// Request Interceptor: Inject bearer tokens seamlessly
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

// Response Interceptor: Smart background token-refresh engine
Axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const { config, response } = error;
        const originalRequest = config;

        const requestUrl = originalRequest?.url ? originalRequest.url.replace(API_URL, '').split('?')[0] : '';
        const isPublicRoute = publicRoutes.some(route => requestUrl.includes(route));

        if (isPublicRoute) {
            return Promise.reject(error);
        }

        if (response && response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

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
