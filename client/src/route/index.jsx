import { createHashRouter } from "react-router-dom";
import { lazy, Suspense } from "react";
import App from "../App";

// Eager load only the most critical pages
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";

// Lazy load everything else
const SearchPage = lazy(() => import('../pages/Searchpage'))
const ForgotPassword = lazy(() => import('../pages/ForgotPassword'))
const OtpVerification = lazy(() => import('../pages/OtpVerification'))
const ResetPassword = lazy(() => import('../pages/ResetPassword'))
const UserMenuMobile = lazy(() => import('../pages/UserMenuMobile'))
const Dashboard = lazy(() => import('../layouts/Dashboard'))
const Profile = lazy(() => import('../pages/Profile'))
const MyOrders = lazy(() => import('../pages/MyOrders'))
const Address = lazy(() => import('../pages/Address'))
const CategoryPage = lazy(() => import('../pages/CategoryPage'))
const SubCategoryPage = lazy(() => import('../pages/SubCategoryPage'))
const UploadProduct = lazy(() => import('../pages/UploadProduct'))
const ProductAdmin = lazy(() => import('../pages/ProductAdmin'))
const AdminPermision = lazy(() => import('../layouts/AdminPermision'))
const SellerPermission = lazy(() => import('../layouts/SellerPermission'))
const ProductListPage = lazy(() => import('../pages/ProductListPage'))
const ProductDisplayPage = lazy(() => import('../pages/ProductDisplayPage'))
const CartMobile = lazy(() => import('../pages/CartMobile'))
const CheckoutPage = lazy(() => import('../pages/CheckoutPage'))
const Success = lazy(() => import('../pages/Success'))
const Cancel = lazy(() => import('../pages/Cancel'))
const RiderTracking = lazy(() => import('../pages/RiderTracking'))
const RiderDashboard = lazy(() => import('../pages/RiderDashboard'))
const StoreOrders = lazy(() => import('../pages/StoreOrders'))
const Wallet = lazy(() => import('../pages/Wallet'))
const AdminSummary = lazy(() => import('../components/AdminSummary'))
const ReferAndEarn = lazy(() => import('../pages/ReferAndEarn'))
const WishlistPage = lazy(() => import('../pages/WishlistPage'))
const TrackingPage = lazy(() => import('../pages/TrackingPage'))
const AllDealsPage = lazy(() => import('../pages/AllDealsPage'))
const SnapitPlus = lazy(() => import('../components/SnapitPlus'))
const StreakTracker = lazy(() => import('../components/StreakTracker'))
const MySubscriptions = lazy(() => import('../pages/MySubscriptions'))
const SellerDashboard = lazy(() => import('../pages/SellerDashboard'))
const FoodHomePage = lazy(() => import('../pages/FoodHomePage'))

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

const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { path: "", element: <Home /> },
      { path: "search", element: <S><SearchPage /></S> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "forgot-password", element: <S><ForgotPassword /></S> },
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
            path: "upload-product",
            element: <S><SellerPermission><UploadProduct /></SellerPermission></S>
          },
          { path: "order-tracking/:id", element: <S><RiderTracking /></S> },
          {
            path: "category",
            element: <S><AdminPermision><CategoryPage /></AdminPermision></S>
          },
          {
            path: "subcategory",
            element: <S><AdminPermision><SubCategoryPage /></AdminPermision></S>
          },
          {
            path: "product",
            element: <S><AdminPermision><ProductAdmin /></AdminPermision></S>
          },
        ]
      },
      { path: "track/:orderId", element: <S><TrackingPage /></S> },
      {
        path: ":category",
        children: [
          { index: true, element: <S><ProductListPage /></S> },
          { path: ":subCategory", element: <S><ProductListPage /></S> }
        ]
      },
      { path: "product/:product", element: <S><ProductDisplayPage /></S> },
      { path: "cart", element: <S><CartMobile /></S> },
      { path: "checkout", element: <S><CheckoutPage /></S> },
      { path: "success", element: <S><Success /></S> },
      { path: "cancel", element: <S><Cancel /></S> },
      { path: "food", element: <S><FoodHomePage /></S> },
    ]
  }
])

export default router;
