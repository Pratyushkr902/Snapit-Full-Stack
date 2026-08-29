import { createHashRouter, useRouteError, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import App from "../App";

// Critical Pages
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/RegisterOtp";

// Lazy Loaded Pages
const PublicTrackingPage     = lazy(() => import('../pages/PublicTrackingPage'))
const SearchPage             = lazy(() => import('../pages/Searchpage'))
const ForgotPassword         = lazy(() => import('../pages/ForgotPassword'))
const VerifyEmail            = lazy(() => import('../pages/VerifyEmail'))
const OtpVerification        = lazy(() => import('../pages/OtpVerification'))
const ResetPassword          = lazy(() => import('../pages/ResetPassword'))
const UserMenuMobile         = lazy(() => import('../pages/UserMenuMobile'))
const Dashboard              = lazy(() => import('../layouts/Dashboard'))
const Profile                = lazy(() => import('../pages/Profile'))
const MyOrders               = lazy(() => import('../pages/MyOrders'))
const Address                = lazy(() => import('../pages/Address'))
const CategoryPage           = lazy(() => import('../pages/CategoryPage'))
const SubCategoryPage        = lazy(() => import('../pages/SubCategoryPage'))
const UploadProduct          = lazy(() => import('../pages/UploadProduct'))
const ProductAdmin           = lazy(() => import('../pages/ProductAdmin'))
const AdminPermision         = lazy(() => import('../layouts/AdminPermision'))
const SellerPermission       = lazy(() => import('../layouts/SellerPermission'))
const ProductListPage        = lazy(() => import('../pages/ProductListPage'))
const ProductDisplayPage     = lazy(() => import('../pages/ProductDisplayPage'))
const CartMobile             = lazy(() => import('../pages/CartMobile'))
const CheckoutPage           = lazy(() => import('../pages/CheckoutPage'))
const Success                = lazy(() => import('../pages/Success'))
const Cancel                 = lazy(() => import('../pages/Cancel'))
const RiderTracking          = lazy(() => import('../pages/RiderTracking'))
const RiderDashboard         = lazy(() => import('../pages/RiderDashboard'))
const AdminRefunds           = lazy(() => import('../pages/AdminRefunds'))
const AdminWithdrawals       = lazy(() => import('../pages/AdminWithdrawals'))
const AdminReferrals         = lazy(() => import('../pages/AdminReferrals'))
const AdminManageAdmins      = lazy(() => import('../pages/AdminManageAdmins'))
const AdminFrozenIps         = lazy(() => import('../pages/AdminFrozenIps'))
const AdminBannerOffers      = lazy(() => import('../pages/AdminBannerOffers'))
const SuperAdminDashboard    = lazy(() => import('../pages/SuperAdminDashboard'))
const StoreOrders            = lazy(() => import('../pages/StoreOrders'))
const Wallet                 = lazy(() => import('../pages/Wallet'))
const AdminSummary           = lazy(() => import('../components/AdminSummary'))
const AdminTreasury          = lazy(() => import('../pages/AdminTreasury'))
const ReferAndEarn           = lazy(() => import('../pages/ReferAndEarn'))
const WishlistPage           = lazy(() => import('../pages/WishlistPage'))
const TrackingPage           = lazy(() => import('../pages/TrackingPage'))
const AllDealsPage           = lazy(() => import('../pages/AllDealsPage'))
const SnapitPlus             = lazy(() => import('../components/SnapitPlus'))
const StreakTracker          = lazy(() => import('../components/StreakTracker'))
const MySubscriptions        = lazy(() => import('../pages/MySubscriptions'))
const SellerDashboard        = lazy(() => import('../pages/SellerDashboard'))
const FoodHomePage           = lazy(() => import('../pages/FoodHomePage'))
const RestaurantDetailPage   = lazy(() => import('../pages/RestaurantDetailPage'))
const RestaurantAdminPage    = lazy(() => import('../pages/RestaurantAdminPage'))
const AdminSellerStorePanel  = lazy(() => import('../pages/AdminSellerStorePanel'))
const AdminCampusAmbassadors = lazy(() => import('../pages/AdminCampusAmbassadors'))
const SellerEarnings         = lazy(() => import('../pages/SellerEarnings'))
const RestoSellerDashboard   = lazy(() => import('../pages/RestoSellerDashboard'))
const GroceryPage            = lazy(() => import('../pages/GroceryPage'))
const PharmacyPage           = lazy(() => import('../pages/PharmacyPage'))
const FoodCheckoutPage       = lazy(() => import('../pages/FoodCheckoutPage'))
const AdminRiderFleet        = lazy(() => import('../pages/AdminRiderFleet'))

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
    
    // Auto-recover from stale dynamic chunk imports on new deployments
    const errMsg = String(error?.message || error || '').toLowerCase()
    if (
      errMsg.includes('dynamically imported module') ||
      errMsg.includes('loading chunk') ||
      errMsg.includes('failed to fetch') ||
      errMsg.includes('chunkloaderror')
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