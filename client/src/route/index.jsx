import { createHashRouter, useRouteError, useNavigate, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import App from "../App";

// Critical Pages
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/RegisterOtp";

// Helper for auto-retrying and recovering dynamic chunk loads on new deployments
const lazyRetry = (componentImport) =>
  lazy(async () => {
    try {
      return await componentImport()
    } catch (error) {
      console.warn('[lazyRetry] Chunk load error, attempting recovery:', error?.message)
      const reloadKey = 'snapit_chunk_reload_' + (window.location.hash || window.location.pathname)
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1')
        window.location.reload()
        return new Promise(() => {}) // Hold until reload
      }
      throw error
    }
  })

// Lazy Loaded Pages with auto-retry
const PublicTrackingPage     = lazyRetry(() => import('../pages/PublicTrackingPage'))
const SearchPage             = lazyRetry(() => import('../pages/Searchpage'))
const ForgotPassword         = lazyRetry(() => import('../pages/ForgotPassword'))
const VerifyEmail            = lazyRetry(() => import('../pages/VerifyEmail'))
const OtpVerification        = lazyRetry(() => import('../pages/OtpVerification'))
const ResetPassword          = lazyRetry(() => import('../pages/ResetPassword'))
const UserMenuMobile         = lazyRetry(() => import('../pages/UserMenuMobile'))
const Dashboard              = lazyRetry(() => import('../layouts/Dashboard'))
const Profile                = lazyRetry(() => import('../pages/Profile'))
const MyOrders               = lazyRetry(() => import('../pages/MyOrders'))
const Address                = lazyRetry(() => import('../pages/Address'))
const CategoryPage           = lazyRetry(() => import('../pages/CategoryPage'))
const SubCategoryPage        = lazyRetry(() => import('../pages/SubCategoryPage'))
const UploadProduct          = lazyRetry(() => import('../pages/UploadProduct'))
const ProductAdmin           = lazyRetry(() => import('../pages/ProductAdmin'))
const AdminPermision         = lazyRetry(() => import('../layouts/AdminPermision'))
const SellerPermission       = lazyRetry(() => import('../layouts/SellerPermission'))
const ProductListPage        = lazyRetry(() => import('../pages/ProductListPage'))
const ProductDisplayPage     = lazyRetry(() => import('../pages/ProductDisplayPage'))
const CartMobile             = lazyRetry(() => import('../pages/CartMobile'))
const CheckoutPage           = lazyRetry(() => import('../pages/CheckoutPage'))
const Success                = lazyRetry(() => import('../pages/Success'))
const Cancel                 = lazyRetry(() => import('../pages/Cancel'))
const RiderTracking          = lazyRetry(() => import('../pages/RiderTracking'))
const RiderDashboard         = lazyRetry(() => import('../pages/RiderDashboard'))
const AdminRefunds           = lazyRetry(() => import('../pages/AdminRefunds'))
const AdminWithdrawals       = lazyRetry(() => import('../pages/AdminWithdrawals'))
const AdminReferrals         = lazyRetry(() => import('../pages/AdminReferrals'))
const AdminManageAdmins      = lazyRetry(() => import('../pages/AdminManageAdmins'))
const AdminFrozenIps         = lazyRetry(() => import('../pages/AdminFrozenIps'))
const AdminBannerOffers      = lazyRetry(() => import('../pages/AdminBannerOffers'))
const SuperAdminDashboard    = lazyRetry(() => import('../pages/SuperAdminDashboard'))
const StoreOrders            = lazyRetry(() => import('../pages/StoreOrders'))
const Wallet                 = lazyRetry(() => import('../pages/Wallet'))
const AdminSummary           = lazyRetry(() => import('../components/AdminSummary'))
const AdminTreasury          = lazyRetry(() => import('../pages/AdminTreasury'))
const ReferAndEarn           = lazyRetry(() => import('../pages/ReferAndEarn'))
const WishlistPage           = lazyRetry(() => import('../pages/WishlistPage'))
const TrackingPage           = lazyRetry(() => import('../pages/TrackingPage'))
const AllDealsPage           = lazyRetry(() => import('../pages/AllDealsPage'))
const SnapitPlus             = lazyRetry(() => import('../components/SnapitPlus'))
const StreakTracker          = lazyRetry(() => import('../components/StreakTracker'))
const MySubscriptions        = lazyRetry(() => import('../pages/MySubscriptions'))
const SellerDashboard        = lazyRetry(() => import('../pages/SellerDashboard'))
const FoodHomePage           = lazyRetry(() => import('../pages/FoodHomePage'))
const RestaurantDetailPage   = lazyRetry(() => import('../pages/RestaurantDetailPage'))
const RestaurantAdminPage    = lazyRetry(() => import('../pages/RestaurantAdminPage'))
const AdminSellerStorePanel  = lazyRetry(() => import('../pages/AdminSellerStorePanel'))
const AdminCampusAmbassadors = lazyRetry(() => import('../pages/AdminCampusAmbassadors'))
const SellerEarnings         = lazyRetry(() => import('../pages/SellerEarnings'))
const RestoSellerDashboard   = lazyRetry(() => import('../pages/RestoSellerDashboard'))
const GroceryPage            = lazyRetry(() => import('../pages/GroceryPage'))
const PharmacyPage           = lazyRetry(() => import('../pages/PharmacyPage'))
const FoodCheckoutPage       = lazyRetry(() => import('../pages/FoodCheckoutPage'))
const AdminRiderFleet        = lazyRetry(() => import('../pages/AdminRiderFleet'))
const MarketingHubPage       = lazyRetry(() => import('../pages/MarketingHubPage'))

// Spinner shown while lazy chunks load
const PageLoader = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '60vh', width: '100%'
  }}>
    <div style={{
      width: 36, height: 36, border: '3px solid #e5e7eb',
      borderTop: '3px solid #16a34a', borderRadius: '50%',
      animation: 'spin 0.7s linear infinite'
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>
)

const S = ({ children }) => <Suspense fallback={<PageLoader />}>{children}</Suspense>

// Friendly error page shown instead of React Router's default crash screen
const ErrorPage = () => {
  const error = useRouteError()
  const navigate = useNavigate()
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    console.error("Route error caught by ErrorPage:", error)
    
    // Auto-recover from stale dynamic chunk imports and MIME type mismatch on new deployments
    const errMsg = String(error?.message || error || '').toLowerCase()
    if (
      errMsg.includes('dynamically imported module') ||
      errMsg.includes('loading chunk') ||
      errMsg.includes('failed to fetch') ||
      errMsg.includes('chunkloaderror') ||
      errMsg.includes('text/html') ||
      errMsg.includes('mime type') ||
      errMsg.includes('module script') ||
      errMsg.includes('syntaxerror') ||
      errMsg.includes('importing a module')
    ) {
      const reloadKey = 'snapit_chunk_reload_' + (window.location.hash || window.location.pathname)
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1')
        window.location.reload()
      }
    }
  }, [error])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', padding: '24px',
      background: '#fff', textAlign: 'center', fontFamily: 'sans-serif'
    }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>😕</div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
        Something went wrong
      </h1>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24, maxWidth: 320 }}>
        The page ran into an unexpected error. Tap below to refresh or return home.
      </p>
      
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => {
            window.location.reload()
          }}
          style={{
            background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1',
            borderRadius: 12, padding: '12px 24px', fontSize: 14,
            fontWeight: 700, cursor: 'pointer'
          }}
        >
          🔄 Try Again
        </button>
        <button
          onClick={() => {
            navigate('/', { replace: true })
            window.location.hash = '#/'
            window.location.reload()
          }}
          style={{
            background: '#16a34a', color: '#fff', border: 'none',
            borderRadius: 12, padding: '12px 28px', fontSize: 14,
            fontWeight: 700, cursor: 'pointer'
          }}
        >
          Go to Home
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 24, maxWidth: 440, width: '100%' }}>
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              background: 'transparent', border: 'none', color: '#94a3b8',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline'
            }}
          >
            {showDetails ? 'Hide Error Details' : 'View Error Details'}
          </button>
          {showDetails && (
            <pre style={{
              marginTop: 12, padding: 12, background: '#fef2f2', borderRadius: 8,
              fontSize: 11, color: '#dc2626', textAlign: 'left',
              overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word'
            }}>
              {error?.stack || error?.message || String(error)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

import { useSelector } from "react-redux";

const DashboardIndex = () => {
  const user = useSelector(state => state.user)
  const role = (user?.role || '').replace(/['"]/g, '').trim().toUpperCase()

  if (role === 'SUPER_ADMIN') {
    return <Navigate to="/dashboard/super-admin" replace />
  }
  if (role === 'ADMIN') {
    return <Navigate to="/dashboard/admin-summary" replace />
  }
  if (role === 'SELLER') {
    return <Navigate to="/dashboard/seller-dashboard" replace />
  }
  if (role === 'RESTO_SELLER') {
    return <Navigate to="/dashboard/resto-dashboard" replace />
  }
  if (role === 'RIDER') {
    return <Navigate to="/rider-panel" replace />
  }
  return <Navigate to="/dashboard/myorders" replace />
}

const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      { path: "", element: <Home /> },
      { path: "search", element: <S><SearchPage /></S> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "forgot-password", element: <S><ForgotPassword /></S> },
      { path: "verify-email", element: <S><VerifyEmail /></S> },
      { path: "verification-otp", element: <S><OtpVerification /></S> },
      { path: "reset-password", element: <S><ResetPassword /></S> },
      { path: "user", element: <S><UserMenuMobile /></S> },
      { path: "wallet", element: <S><Wallet /></S> },
      { path: "refer", element: <S><ReferAndEarn /></S> },
      { path: "wishlist", element: <S><WishlistPage /></S> },
      { path: "deals", element: <S><AllDealsPage /></S> },
      { path: "snapit-plus", element: <S><SnapitPlus /></S> },
      { path: "streak", element: <S><StreakTracker /></S> },
      { path: "subscriptions", element: <S><MySubscriptions /></S> },
      { path: "rider-panel", element: <S><RiderDashboard /></S> },
      {
        path: "dashboard",
        element: <S><Dashboard /></S>,
        children: [
          { index: true, element: <DashboardIndex /> },
          { path: "profile", element: <S><Profile /></S> },
          {
            path: "admin-summary",
            element: <S><AdminPermision><AdminSummary /></AdminPermision></S>
          },
          { path: "myorders", element: <S><MyOrders /></S> },
          { path: "address", element: <S><Address /></S> },
          { path: "store-orders", element: <S><StoreOrders /></S> },
          {
            path: "seller-dashboard",
            element: <S><SellerPermission><SellerDashboard /></SellerPermission></S>
          },
          {
            path: "restaurant-admin",
            element: <S><AdminPermision><RestaurantAdminPage /></AdminPermision></S>
          },
          {
            path: "store-sellers",
            element: <S><AdminPermision><AdminSellerStorePanel /></AdminPermision></S>
          },
          {
            path: "campus-ambassadors",
            element: <S><AdminPermision><AdminCampusAmbassadors /></AdminPermision></S>
          },
          {
            path: "store-earnings",
            element: <S><AdminPermision><SellerEarnings /></AdminPermision></S>
          },
          {
            path: "resto-dashboard",
            element: <S><RestoSellerDashboard /></S>
          },
          {
            path: "upload-product",
            element: <S><SellerPermission><UploadProduct /></SellerPermission></S>
          },
          { path: "order-tracking/:id", element: <S><RiderTracking /></S> },
          { path: "rider-panel", element: <S><RiderDashboard /></S> },
          {
            path: "category",
            element: <S><AdminPermision><CategoryPage /></AdminPermision></S>
          },
          {
            path: "subcategory",
            element: <S><AdminPermision><SubCategoryPage /></AdminPermision></S>
          },
          { path: "refunds", element: <S><AdminPermision><AdminRefunds /></AdminPermision></S> },
          { path: "super-admin", element: <S><SuperAdminDashboard /></S> },
          { path: "super-admin/treasury", element: <S><AdminTreasury /></S> },
          { path: "treasury", element: <S><AdminPermision><AdminTreasury /></AdminPermision></S> },
          { path: "rider-fleet", element: <S><AdminPermision><AdminRiderFleet /></AdminPermision></S> },
          { path: "super-admin/withdrawals", element: <S><AdminWithdrawals /></S> },
          { path: "super-admin/referrals", element: <S><AdminReferrals /></S> },
          { path: "super-admin/manage-admins", element: <S><AdminManageAdmins /></S> },
          { path: "super-admin/frozen-ips", element: <S><AdminFrozenIps /></S> },
          { path: "marketing", element: <S><AdminPermision><MarketingHubPage /></AdminPermision></S> },
          { path: "super-admin/marketing", element: <S><MarketingHubPage /></S> },
          { path: "super-admin/banner-offers", element: <S><AdminBannerOffers /></S> },
          {
            path: "product",
            element: <S><AdminPermision><ProductAdmin /></AdminPermision></S>
          },
        ]
      },
      { path: "track/:orderId", element: <S><TrackingPage /></S> },
      { path: "public-tracking/:token", element: <S><PublicTrackingPage /></S> },
      { path: "track-order/:token", element: <S><PublicTrackingPage /></S> },
      { path: "product/:product", element: <S><ProductDisplayPage /></S> },
      { path: "cart", element: <S><CartMobile /></S> },
      { path: "checkout", element: <S><CheckoutPage /></S> },
      { path: "food-checkout", element: <S><FoodCheckoutPage /></S> },
      { path: "success", element: <S><Success /></S> },
      { path: "cancel", element: <S><Cancel /></S> },
      { path: "food", element: <S><FoodHomePage /></S> },
      { path: "restaurant/:id", element: <S><RestaurantDetailPage /></S> },
      { path: "grocery", element: <S><GroceryPage /></S> },
      { path: "pharmacy", element: <S><PharmacyPage /></S> },
      {
        path: ":category",
        children: [
          { index: true, element: <S><ProductListPage /></S> },
          { path: ":subCategory", element: <S><ProductListPage /></S> }
        ]
      },
    ]
  }
])

export default router;