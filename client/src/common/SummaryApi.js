export const baseURL = import.meta.env.VITE_API_URL

const SummaryApi = {
    register : {
        url : '/api/user/register',
        method : 'post'
    },
    login : {
        url : '/api/user/login',
        method : 'post'
    },
    forgot_password : {
        url : "/api/user/forgot-password",
        method : 'put'
    },
    forgot_password_otp_verification : {
        url : '/api/user/verify-forgot-password-otp',
        method : 'put'
    },
    resetPassword : {
        url : "/api/user/reset-password",
        method : 'put'
    },
    refreshToken : {
        url : '/api/user/refresh-token',
        method : 'post'
    },
    userDetails : {
        url : '/api/user/user-details',
        method : "get"
    },
    logout : {
        url : "/api/user/logout",
        method : 'get'
    },
    uploadAvatar : {
        url : "/api/user/upload-avatar",
        method : 'put'
    },
    updateUserDetails : {
        url : '/api/user/update-user',
        method : 'put'
    },
    getRiders : {
        url : '/api/user/all-riders',
        method : 'get'
    },
    saveFcmToken: {
        url: '/api/user/save-fcm-token',
        method: 'post'
    },
    addCategory : {
        url : '/api/category/add-category',
        method : 'post'
    },
    uploadImage : {
        url : '/api/file/upload',
        method : 'post'
    },
    getCategory : {
        url : '/api/category/get',
        method : 'get'
    },
    updateCategory : {
        url : '/api/category/update',
        method : 'put'
    },
    deleteCategory : {
        url : '/api/category/delete',
        method : 'delete'
    },
    createSubCategory : {
        url : '/api/subcategory/create',
        method : 'post'
    },
    getSubCategory : {
        url : '/api/subcategory/get',
        method : 'post'
    },
    updateSubCategory : {
        url : '/api/subcategory/update',
        method : 'put'
    },
    deleteSubCategory : {
        url : '/api/subcategory/delete',
        method : 'delete'
    },
    createProduct : {
        url : '/api/product/create',
        method : 'post'
    },
    getProduct : {
        url : '/api/product/get',
        method : 'post'
    },
    getSellerProducts: {
        url: '/api/product/get-seller-products',
        method: 'post'
    },
    getProductByCategory : {
        url : '/api/product/get-product-by-category',
        method : 'post'
    },
    getProductByCategoryAndSubCategory : {
        url : '/api/product/get-product-by-category-and-subcategory',
        method : 'post'
    },
    getProductDetails : {
        url : '/api/product/get-product-details',
        method : 'post'
    },
    updateProductDetails : {
        url : "/api/product/update-product-details",
        method : 'put'
    },
    deleteProduct : {
        url : "/api/product/delete-product",
        method : 'delete'
    },
    searchProduct : {
        url : '/api/product/search-product',
        method : 'post'
    },
    addTocart : {
        url : "/api/cart/create",
        method : 'post'
    },
    getCartItem : {
        url : '/api/cart/get',
        method : 'get'
    },
    updateCartItemQty : {
        url : '/api/cart/update-qty',
        method : 'put'
    },
    deleteCartItem : {
        url : '/api/cart/delete-cart-item',
        method : 'delete'
    },
    createAddress : {
        url : '/api/address/create',
        method : 'post'
    },
    getAddress : {
        url : '/api/address/get',
        method : 'get'
    },
    updateAddress : {
        url : '/api/address/update',
        method : 'put'
    },
    disableAddress : {
        url : '/api/address/disable',
        method : 'delete'
    },
    CashOnDeliveryOrder : {
        url : "/api/order/cash-on-delivery",
        method : 'post'
    },
    payment_url : {
        url : "/api/order/checkout",
        method : 'post'
    },
    getOrderItems : {
        url : '/api/order/order-items',
        method : 'get'
    },
    getOrderDetails: {
        url: '/api/order/order-list',
        method: 'get'
    },
    getSellerOrders: {
        url: '/api/order/seller-orders',
        method: 'get'
    },
    getSellerEarnings: {
        url: '/api/order/seller-earnings',
        method: 'get'
    },
    getRiderLocation: {
        url: '/api/order/get-rider-location',
        method: 'post'
    },
    updateOrderStatus: {
        url: '/api/order/update-status',
        method: 'put'
    },
    updateSellerStatus: {
        url: '/api/order/update-seller-status',
        method: 'post'
    },
    getNearestStore: {
        url: '/api/store/nearest',
        method: 'post'
    },
    getAllStores: {
        url: '/api/store/all',
        method: 'get'
    },
    updateStoreInventory: {
        url: '/api/product/update-store-stock',
        method: 'put'
    },
    addStore: {
        url: '/api/store/add',
        method: 'post'
    },
    settleCash: {
        url: '/api/order/settle-cash',
        method: 'post'
    },
    getDailyReport: {
        url: '/api/order/daily-report',
        method: 'get'
    },
    getLastOrder: {
        url: '/api/order/last-order',
        method: 'get'
    },
    getFrequentlyBought: {
        url: '/api/product/frequently-bought',
        method: 'get'
    },
    getWallet: {
        url: '/api/wallet/get',
        method: 'get'
    },
    addMoneyToWallet: {
        url: '/api/wallet/add-money',
        method: 'post'
    },
    payWithWallet: {
        url: '/api/wallet/pay',
        method: 'post'
    },
    getReferralInfo: {
        url: '/api/referral/info',
        method: 'get'
    },
    applyFirstOrderBonus: {
        url: '/api/referral/first-order-bonus',
        method: 'post'
    },
    addReview: {
        url: '/api/review/add',
        method: 'post'
    },
    getReviews: {
        url: '/api/review/get',
        method: 'post'
    },
    deleteReview: {
        url: '/api/review/delete',
        method: 'delete'
    },
    toggleWishlist: {
        url: '/api/review/wishlist/toggle',
        method: 'post'
    },
    getWishlist: {
        url: '/api/review/wishlist/get',
        method: 'get'
    },
    applyFirstTimeCoupon: {
        url: '/api/order/coupon/apply',
        method: 'post'
    },

    // ── Rewards & Coins ──────────────────────────────────────
    getCoinsBalance: {
        url: '/api/coins/balance',
        method: 'get'
    },
    getCheckinStatus: {
        url: '/api/checkin/status',
        method: 'get'
    },
    claimCheckin: {
        url: '/api/checkin/claim',
        method: 'post'
    },
    getStreakMe: {
        url: '/api/streak/me',
        method: 'get'
    },
    claimStreakMilestone: {
        url: '/api/streak/claim',
        method: 'post'
    },
    validatePromo: {
        url: '/api/promo/validate',
        method: 'post'
    },
    redeemCoins: {
        url: '/api/coins/redeem',
        method: 'post'
    },

    // ── Subscriptions ────────────────────────────────────────
    mySubscriptions: {
        url: '/api/subscription/my-subscriptions',
        method: 'get'
    },
    createSubscription: {
        url: '/api/subscription/create',
        method: 'post'
    },
    pauseSubscription: {
        url: '/api/subscription/pause',
        method: 'patch'
    },
    resumeSubscription: {
        url: '/api/subscription/resume',
        method: 'patch'
    },
    cancelSubscription: {
        url: '/api/subscription/cancel',
        method: 'delete'
    },

    // ── Restaurant & Food Ordering ───────────────────────────
    getAllRestaurants: {
        url: '/api/restaurant/all',
        method: 'get'
    },
    getRestaurantById: {
        url: '/api/restaurant/:id',
        method: 'get'
    },
    getRestaurantMenu: {
        url: '/api/restaurant/:id/menu',
        method: 'get'
    },
}

export default SummaryApi