export const baseURL = import.meta.env.VITE_API_URL

const SummaryApi = {
    register : {
        url : '/api/user/register',
        method : 'post'
    },
    sendOtp : {
        url : '/api/otp/send',
        method : 'post'
    },
    verifyOtp : {
        url : '/api/otp/verify',
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
    verify_email : {
        url : '/api/user/verify-email',
        method : 'post'
    },
    verify_email : {
        url : '/api/user/verify-email',
        method : 'post'
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
    getAllAmbassadors : {
        url : '/api/user/all-ambassadors',
        method : 'get'
    },
    createAmbassador : {
        url : '/api/user/create-ambassador',
        method : 'post'
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
    uploadImageR2 : {
        url : '/api/file/upload-r2',
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
    createSupportMessage : {
        url : '/api/support/message',
        method : 'post'
    },
    getSupportMessages : {
        url : '/api/support/messages',
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
    verifyDeliveryOtp: {
        url: '/api/order/verify-delivery-otp',
        method: 'post'
    },
    updateSellerStatus: {
        url: '/api/order/update-seller-status',
        method: 'post'
    },
    verifyDeliveryOtp: {
        url: '/api/order/verify-delivery-otp',
        method: 'post'
    },
    reportOrderDispute: {
        url: '/api/order/report-dispute',
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
    requestWithdrawal: {
        url: '/api/wallet/withdraw',
        method: 'post'
    },
    listWithdrawals: {
        url: '/api/wallet/admin/withdrawals',
        method: 'get'
    },
    approveWithdrawal: {
        url: '/api/wallet/admin/withdrawals/approve',
        method: 'post'
    },
    rejectWithdrawal: {
        url: '/api/wallet/admin/withdrawals/reject',
        method: 'post'
    },
    listReferralsAdmin: {
        url: '/api/admin-management/referrals',
        method: 'get'
    },
    listAdmins: {
        url: '/api/admin-management/list',
        method: 'get'
    },
    createAdmin: {
        url: '/api/admin-management/create',
        method: 'post'
    },
    updateAdminStatus: {
        url: '/api/admin-management/:adminId/status',
        method: 'patch'
    },
    removeAdmin: {
        url: '/api/admin-management/:adminId',
        method: 'delete'
    },
    listFrozenIps: {
        url: '/api/admin-management/frozen-ips',
        method: 'get'
    },
    unfreezeIp: {
        url: '/api/admin-management/frozen-ips',
        method: 'delete'
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
    submitRefund: { url: '/api/refund/submit', method: 'post' },
    getMyRefunds:  { url: '/api/refund/my',     method: 'get'  },
    getAllRefunds:  { url: '/api/refund/all',    method: 'get'  },
    resolveRefund: { url: '/api/refund/resolve', method: 'post' },

    getRestaurantMenu: {
        url: '/api/restaurant/:id/menu',
        method: 'get'
    },

    // ── COD Cash Treasury & Partner Split ─────────────────────
    getTreasurySummary: {
        url: '/api/treasury/summary',
        method: 'get'
    },
    recordTreasuryDeposit: {
        url: '/api/treasury/deposit',
        method: 'post'
    },
    recordTreasuryWithdrawal: {
        url: '/api/treasury/withdraw',
        method: 'post'
    },
    distributeCodToWallets: {
        url: '/api/treasury/distribute-cod',
        method: 'post'
    },
}

export default SummaryApi