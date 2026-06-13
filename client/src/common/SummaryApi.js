import axios from "axios";

// ✅ CRITICAL FIXED DOMAIN TARGET:
const API_URL = import.meta.env.VITE_API_URL || "https://snapit-backend-bn8r.onrender.com";

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
    getSellerProducts: { url: '/api/product/get-seller-products', method: 'post' },
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
    payment_verification: { url: "/api/order/verify-payment", method: 'post' },

    // ✅ FIXED: getOrderDetails now exists and uses GET (was missing entirely — caused
    //           CheckoutPage to fall back to getOrderItems which returns ALL users' orders)
    getOrderDetails: { url: '/api/order/order-list', method: 'get' },

    // Rider-only endpoint (returns all orders, no userId filter — do NOT use for My Orders)
    getOrderItems: { url: '/api/order/order-items', method: 'get' },

    getSellerOrders: { url: '/api/order/seller-orders', method: 'get' },
    getSellerEarnings: { url: '/api/order/seller-earnings', method: 'get' },
    getRiderLocation: { url: '/api/order/get-rider-location', method: 'post' },
    updateOrderStatus: { url: '/api/order/update-status', method: 'put' },
    updateSellerStatus: { url: '/api/order/update-seller-status', method: 'post' },

    getNearestStore: { url: '/api/store/nearest', method: 'post' },
    getAllStores: { url: '/api/store/all', method: 'get' },
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

    // ── Rewards & Coins ──────────────────────────────────────────────────────
    getCoinsBalance:        { url: '/api/coins/balance',        method: 'get'  },
    getCheckinStatus:       { url: '/api/checkin/status',       method: 'get'  },
    claimCheckin:           { url: '/api/checkin/claim',        method: 'post' },
    getStreakMe:            { url: '/api/streak/me',            method: 'get'  },
    claimStreakMilestone:   { url: '/api/streak/claim',         method: 'post' },
    validatePromo:          { url: '/api/promo/validate',       method: 'post' },
    redeemCoins:            { url: '/api/coins/redeem',         method: 'post' },

    // ── Subscriptions ────────────────────────────────────────────────────────
    mySubscriptions:    { url: '/api/subscription/my-subscriptions', method: 'get' },
    createSubscription: { url: '/api/subscription/create',           method: 'post' },
    pauseSubscription:  { url: '/api/subscription/pause',            method: 'patch' },
    resumeSubscription: { url: '/api/subscription/resume',           method: 'patch' },
    cancelSubscription: { url: '/api/subscription/cancel',           method: 'delete' },

    // ── Restaurant & Food Ordering ───────────────────────────────────────────
    getAllRestaurants:   { url: '/api/restaurant/all',        method: 'get' },
    getRestaurantById:  { url: '/api/restaurant/:id',         method: 'get' },
    getRestaurantMenu:  { url: '/api/restaurant/:id/menu',    method: 'get' },
};

// =========================================================================
// TOKEN HELPERS — single source of truth for token key names
// =========================================================================

// FIX: Standardized to one key each. The dual-key pattern (accesstoken / accessToken)
//      caused the request interceptor to sometimes re-read a stale token on retry
//      because writes and reads used different casings in different places.
const TOKEN_KEYS = {
    access:  'accessToken',
    refresh: 'refreshToken',
};

const getAccessToken  = () => localStorage.getItem(TOKEN_KEYS.access);
const getRefreshToken = () => localStorage.getItem(TOKEN_KEYS.refresh);

const saveAccessToken = (token) => {
    localStorage.setItem(TOKEN_KEYS.access, token);
    // FIX: Keep the Axios default header in sync immediately so that any request
    //      re-entering the request interceptor uses the new token, not the old one.
    Axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

const clearTokens = () => {
    localStorage.removeItem(TOKEN_KEYS.access);
    localStorage.removeItem(TOKEN_KEYS.refresh);
};

// =========================================================================
// GLOBAL INSTANCE CONFIGURATION & CROSS-PLATFORM INTERCEPTORS
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

// -------------------------------------------------------------------------
// Request Interceptor: Inject bearer token
// -------------------------------------------------------------------------
Axios.interceptors.request.use(
    (config) => {
        // FIX: Reads from single standardized key. Previously read two keys
        //      (accesstoken / accessToken) which could return the old token
        //      if the write used a different casing than the read.
        const accessToken = getAccessToken();
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }

        // Remove Content-Type for FormData so browser sets multipart/form-data automatically
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// -------------------------------------------------------------------------
// Response Interceptor: Smart background token-refresh engine
// -------------------------------------------------------------------------
Axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const { config, response } = error;
        const originalRequest = config;

        const requestUrl = originalRequest?.url
            ? originalRequest.url.replace(API_URL, '').split('?')[0]
            : '';
        const isPublicRoute = publicRoutes.some(route => requestUrl.includes(route));

        if (isPublicRoute) {
            return Promise.reject(error);
        }

        if (response && response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // FIX: Reads from single standardized key.
            const refreshToken = getRefreshToken();
            if (!refreshToken) {
                handleLogoutRedirect();
                return Promise.reject(error);
            }

            // Another request is already refreshing — queue this one
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

                // FIX: Check all plausible shapes of the refresh response.
                //      Previously only checked data.data.accesstoken (lowercase),
                //      which silently resolved to undefined if the backend returned
                //      data.data.accessToken (camelCase) or a flat data.accessToken.
                //      An undefined token stored as the string "undefined" caused every
                //      retry to 401 even though the refresh itself returned 200.
                const newAccessToken =
                    refreshResponse.data?.data?.accessToken   ||
                    refreshResponse.data?.data?.accesstoken   ||
                    refreshResponse.data?.accessToken         ||
                    refreshResponse.data?.accesstoken;

                if (!newAccessToken || newAccessToken === 'undefined') {
                    console.error('[Auth] Refresh response shape unexpected:', JSON.stringify(refreshResponse.data));
                    throw new Error(`No access token found in refresh response`);
                }

                // FIX: saveAccessToken writes localStorage AND updates
                //      Axios.defaults.headers so re-intercepted retries use the fresh token.
                saveAccessToken(newAccessToken);

                isRefreshing = false;
                onTokenRefreshed(newAccessToken);

                // Explicitly set on the original request before retrying
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return Axios(originalRequest);

            } catch (refreshError) {
                isRefreshing = false;
                refreshSubscribers = [];
                clearTokens();
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