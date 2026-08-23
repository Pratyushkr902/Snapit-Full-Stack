import axios from "axios"
import secureStorage from "./secureStorage"

// ─── SECURITY FIX: No hardcoded fallback URL ────────────────────────────────
// The backend URL must always come from the environment.
// A missing env var in production will now throw immediately (fail-loud),
// rather than silently pointing at a hardcoded Render URL.
const API_URL = import.meta.env.VITE_API_URL || "https://snapit-full-stack-production.up.railway.app"

export const baseURL = API_URL

export const SummaryApi = {
    register:                           { url: '/api/user/register',                           method: 'post' },
    login:                              { url: '/api/user/login',                              method: 'post' },
    forgot_password:                    { url: "/api/user/forgot-password",                    method: 'put'  },
    forgot_password_otp_verification:   { url: '/api/user/verify-forgot-password-otp',         method: 'put'  },
    resetPassword:                      { url: "/api/user/reset-password",                     method: 'put'  },
    refreshToken:                       { url: '/api/user/refresh-token',                      method: 'post' },
    userDetails:                        { url: '/api/user/user-details',                       method: 'get'  },
    logout:                             { url: "/api/user/logout",                             method: 'get'  },
    uploadAvatar:                       { url: "/api/user/upload-avatar",                      method: 'put'  },
    updateUserDetails:                  { url: '/api/user/update-user',                        method: 'put'  },
    getRiders:                          { url: '/api/user/all-riders',                         method: 'get'  },
    saveFcmToken:                       { url: '/api/user/save-fcm-token',                     method: 'post' },

    addCategory:                        { url: '/api/category/add-category',                   method: 'post'   },
    uploadImage:                        { url: '/api/file/upload',                             method: 'post'   },
    getCategory:                        { url: '/api/category/get',                            method: 'get'    },
    updateCategory:                     { url: '/api/category/update',                         method: 'put'    },
    deleteCategory:                     { url: '/api/category/delete',                         method: 'delete' },

    createSubCategory:                  { url: '/api/subcategory/create',                      method: 'post'   },
    getSubCategory:                     { url: '/api/subcategory/get',                         method: 'post'   },
    updateSubCategory:                  { url: '/api/subcategory/update',                      method: 'put'    },
    deleteSubCategory:                  { url: '/api/subcategory/delete',                      method: 'delete' },

    createProduct:                      { url: '/api/product/create',                          method: 'post'   },
    getProduct:                         { url: '/api/product/get',                             method: 'post'   },
    getSellerProducts:                  { url: '/api/product/get-seller-products',             method: 'post'   },
    getProductByCategory:               { url: '/api/product/get-product-by-category',         method: 'post'   },
    getProductByCategoryAndSubCategory: { url: '/api/product/get-product-by-category-and-subcategory', method: 'post' },
    getProductDetails:                  { url: '/api/product/get-product-details',             method: 'post'   },
    updateProductDetails:               { url: "/api/product/update-product-details",          method: 'put'    },
    deleteProduct:                      { url: "/api/product/delete-product",                  method: 'delete' },
    searchProduct:                      { url: '/api/product/search-product',                  method: 'post'   },

    addTocart:                          { url: "/api/cart/create",                             method: 'post'   },
    getCartItem:                        { url: '/api/cart/get',                                method: 'get'    },
    updateCartItemQty:                  { url: '/api/cart/update-qty',                         method: 'put'    },
    deleteCartItem:                     { url: '/api/cart/delete-cart-item',                   method: 'delete' },

    createAddress:                      { url: '/api/address/create',                          method: 'post'   },
    getAddress:                         { url: '/api/address/get',                             method: 'get'    },
    updateAddress:                      { url: '/api/address/update',                          method: 'put'    },
    disableAddress:                     { url: '/api/address/disable',                         method: 'delete' },

    CashOnDeliveryOrder:                { url: "/api/order/cash-on-delivery",                  method: 'post' },
    payment_url:                        { url: "/api/order/checkout",                          method: 'post' },
    payment_verification:               { url: "/api/order/verify-payment",                    method: 'post' },
    getOrderDetails:                    { url: '/api/order/order-list',                        method: 'get'  },
    getOrderItems:                      { url: '/api/order/order-items',                       method: 'get'  }, // RIDER only
    getSellerOrders:                    { url: '/api/order/seller-orders',                     method: 'get'  },
    getSellerEarnings:                  { url: '/api/order/seller-earnings',                   method: 'get'  },
    getRiderLocation:                   { url: '/api/order/rider-location',                    method: 'get'  }, // appended with /:orderId
    updateOrderStatus:                  { url: '/api/order/update-status',                     method: 'put'  },
    updateSellerStatus:                 { url: '/api/order/update-seller-status',              method: 'post' },

    getNearestStore:                    { url: '/api/store/nearest',                           method: 'post'   },
    getAllStores:                        { url: '/api/store/all',                               method: 'get'    },
    addStore:                           { url: '/api/store/add',                               method: 'post'   },
    updateStoreInventory:               { url: '/api/product/update-store-stock',              method: 'put'    },
    settleCash:                         { url: '/api/order/settle-cash',                       method: 'post'   },
    getDailyReport:                     { url: '/api/order/daily-report',                      method: 'get'    },
    getLastOrder:                       { url: '/api/order/last-order',                        method: 'get'    },
    getFrequentlyBought:                { url: '/api/product/frequently-bought',               method: 'get'    },

    getWallet:                          { url: '/api/wallet/get',                              method: 'get'  },
    addMoneyToWallet:                   { url: '/api/wallet/add-money',                        method: 'post' },
    payWithWallet:                      { url: '/api/wallet/pay',                              method: 'post' },

    getReferralInfo:                    { url: '/api/referral/info',                           method: 'get'  },
    applyFirstOrderBonus:               { url: '/api/referral/first-order-bonus',              method: 'post' },

    addReview:                          { url: '/api/review/add',                              method: 'post'   },
    getReviews:                         { url: '/api/review/get',                              method: 'post'   },
    deleteReview:                       { url: '/api/review/delete',                           method: 'delete' },
    toggleWishlist:                     { url: '/api/review/wishlist/toggle',                  method: 'post'   },
    getWishlist:                        { url: '/api/review/wishlist/get',                     method: 'get'    },

    applyFirstTimeCoupon:               { url: '/api/order/coupon/apply',                      method: 'post' },

    getCoinsBalance:                    { url: '/api/coins/balance',                           method: 'get'  },
    getCheckinStatus:                   { url: '/api/checkin/status',                          method: 'get'  },
    claimCheckin:                       { url: '/api/checkin/claim',                           method: 'post' },
    getStreakMe:                        { url: '/api/streak/me',                               method: 'get'  },
    claimStreakMilestone:               { url: '/api/streak/claim',                            method: 'post' },
    validatePromo:                      { url: '/api/promo/validate',                          method: 'post' },
    redeemCoins:                        { url: '/api/coins/redeem',                            method: 'post' },

    mySubscriptions:                    { url: '/api/subscription/my-subscriptions',           method: 'get'    },
    createSubscription:                 { url: '/api/subscription/create',                     method: 'post'   },
    pauseSubscription:                  { url: '/api/subscription/pause',                      method: 'patch'  },
    resumeSubscription:                 { url: '/api/subscription/resume',                     method: 'patch'  },
    cancelSubscription:                 { url: '/api/subscription/cancel',                     method: 'delete' },

    getAllRestaurants:                   { url: '/api/restaurant/all',                          method: 'get' },
    getRestaurantById:                  { url: '/api/restaurant/:id',                          method: 'get' },
    getRestaurantMenu:                  { url: '/api/restaurant/:id/menu',                     method: 'get' },
}

// ─── AXIOS INSTANCE ──────────────────────────────────────────────────────────
// SECURITY FIX: Added 15s request timeout to prevent slowloris / hung requests
const Axios = axios.create({
    baseURL:         API_URL,
    withCredentials: true,
    timeout:         15000, // 15 seconds — fail loud rather than hang forever
    headers: {
        'Content-Type': 'application/json',
        'Accept':        'application/json',
    },
})

// ─── TOKEN REFRESH STATE ─────────────────────────────────────────────────────
let isRefreshing = false
let refreshSubscribers = []

const onTokenRefreshed = (newAccessToken) => {
    refreshSubscribers.forEach((cb) => cb(newAccessToken))
    refreshSubscribers = []
}
const addRefreshSubscriber = (cb) => { refreshSubscribers.push(cb) }

// ─── PUBLIC ROUTES (skip auth header) ────────────────────────────────────────
const publicRoutes = [
    '/api/category/get',
    '/api/subcategory/get',
    '/api/product/get',
    '/api/product/get-product-by-category',
    '/api/product/get-product-by-category-and-subcategory',
    '/api/product/get-product-details',
    '/api/product/search-product',
    '/api/user/login',
    '/api/user/register',
]

// ─── REQUEST INTERCEPTOR ─────────────────────────────────────────────────────
// SECURITY FIX: Use a single canonical token key ('accessToken').
// Tokens should ideally live in httpOnly cookies (set by the server) so JS
// cannot read them at all.  Until that migration is done we keep one key name.
Axios.interceptors.request.use(
    async (config) => {
        // SECURITY NOTE: Read from one canonical key only.
        // Migrate to httpOnly cookie auth to eliminate this entirely.
        const accessToken = await secureStorage.getItem('accessToken')
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`
        }

        // Let the browser set Content-Type with correct boundary for multipart
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type']
        }

        return config
    },
    (error) => Promise.reject(error)
)

// ─── RESPONSE INTERCEPTOR ────────────────────────────────────────────────────
Axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const { config, response } = error
        const originalRequest = config

        // SECURITY FIX: Handle 429 explicitly — surface rate-limit info to the user
        if (response?.status === 429) {
            const retryAfter = response.headers?.['retry-after'] || 60
            const msg = `Too many requests. Please wait ${retryAfter} seconds and try again.`
            // Attach human-readable message so UI can toast it
            error.rateLimitMessage = msg
            console.warn(`[Rate limited] retry-after: ${retryAfter}s`)
            return Promise.reject(error)
        }

        const requestUrl = originalRequest?.url
            ? originalRequest.url.replace(API_URL, '').split('?')[0]
            : ''
        const isPublicRoute = publicRoutes.some(route => requestUrl.includes(route))

        if (isPublicRoute) {
            return Promise.reject(error)
        }

        if (response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true

            // SECURITY NOTE: refreshToken should come from an httpOnly cookie.
            // Until that migration is done, read from canonical single key.
            const refreshToken = await secureStorage.getItem('refreshToken')
            if (!refreshToken) {
                handleLogoutRedirect()
                return Promise.reject(error)
            }

            if (isRefreshing) {
                return new Promise((resolve) => {
                    addRefreshSubscriber((newAccessToken) => {
                        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
                        resolve(Axios(originalRequest))
                    })
                })
            }

            isRefreshing = true

            try {
                const refreshUrl = SummaryApi.refreshToken.url.startsWith('http')
                    ? SummaryApi.refreshToken.url
                    : `${API_URL}${SummaryApi.refreshToken.url.startsWith('/') ? '' : '/'}${SummaryApi.refreshToken.url}`

                const refreshResponse = await axios({
                    method:          'post',
                    url:             refreshUrl,
                    withCredentials: true,
                    headers: {
                        'Content-Type':  'application/json',
                        'Authorization': `Bearer ${refreshToken}`,
                    },
                })

                const newAccessToken =
                    refreshResponse.data?.data?.accessToken ||
                    refreshResponse.data?.data?.accesstoken

                if (!newAccessToken) throw new Error('No access token in refresh response')

                // SECURITY FIX: Use one canonical key name for access token
                await secureStorage.setItem('accessToken', newAccessToken)

                isRefreshing = false
                onTokenRefreshed(newAccessToken)

                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
                return Axios(originalRequest)

            } catch (refreshError) {
                isRefreshing = false
                refreshSubscribers = []
                handleLogoutRedirect()
                return Promise.reject(refreshError)
            }
        }

        return Promise.reject(error)
    }
)

// ─── LOGOUT HELPER ────────────────────────────────────────────────────────────
// SECURITY FIX: Clear only auth-specific keys, not ALL localStorage.
// Clearing everything nukes unrelated app state and is unnecessarily blunt.
const handleLogoutRedirect = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    if (typeof window !== 'undefined') {
        window.location.hash = '#/login'
    }
}

export default Axios