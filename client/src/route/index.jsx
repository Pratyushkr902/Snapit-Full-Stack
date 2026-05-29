import { createHashRouter } from "react-router-dom";
import App from "../App";
import Home from "../pages/Home";
import SearchPage from "../pages/Searchpage";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";
import OtpVerification from "../pages/OtpVerification";
import ResetPassword from "../pages/ResetPassword";
import UserMenuMobile from "../pages/UserMenuMobile";
import Dashboard from "../layouts/Dashboard";
import Profile from "../pages/Profile";
import MyOrders from "../pages/MyOrders";
import Address from "../pages/Address";
import CategoryPage from "../pages/CategoryPage";
import SubCategoryPage from "../pages/SubCategoryPage";
import UploadProduct from "../pages/UploadProduct";
import ProductAdmin from "../pages/ProductAdmin";
import AdminPermision from "../layouts/AdminPermision";
import ProductListPage from "../pages/ProductListPage";
import ProductDisplayPage from "../pages/ProductDisplayPage";
import CartMobile from "../pages/CartMobile";
import CheckoutPage from "../pages/CheckoutPage";
import Success from "../pages/Success";
import Cancel from "../pages/Cancel";
import RiderTracking from "../pages/RiderTracking";
import RiderDashboard from "../pages/RiderDashboard";
import StoreOrders from "../pages/StoreOrders";
import Wallet from '../pages/Wallet';
import AdminSummary from '../components/AdminSummary';
import ReferAndEarn from '../pages/ReferAndEarn';
import WishlistPage from '../pages/WishlistPage';
import TrackingPage from '../pages/TrackingPage';

// ✅ NEW: Feature pages
import SnapitPlus from '../components/SnapitPlus';
import StreakTracker from '../components/StreakTracker';
import MySubscriptions from '../pages/MySubscriptions';

const router = createHashRouter([
    {
        path : "/",
        element : <App/>,
        children : [
            {
                path : "",
                element : <Home/>
            },
            {
                path : "search",
                element : <SearchPage/>
            },
            {
                path : 'login',
                element : <Login/>
            },
            {
                path : "register",
                element : <Register/>
            },
            {
                path : "forgot-password",
                element : <ForgotPassword/>
            },
            {
                path : "verification-otp",
                element : <OtpVerification/>
            },
            {
                path : "reset-password",
                element : <ResetPassword/>
            },
            {
                path : "user",
                element : <UserMenuMobile/>
            },
            {
                path : "wallet",
                element : <Wallet />
            },
            {
                path : "refer",
                element : <ReferAndEarn />
            },
            {
                path : "wishlist",
                element : <WishlistPage />
            },
            // ✅ NEW ROUTES
            {
                path : "snapit-plus",
                element : <SnapitPlus />
            },
            {
                path : "streak",
                element : <StreakTracker />
            },
            {
                path : "subscriptions",
                element : <MySubscriptions />
            },
            {
                path : "rider-panel",
                element : <RiderDashboard />
            },
            {
                path : "dashboard",
                element : <Dashboard/>,
                children : [
                    {
                        path : "profile",
                        element : <Profile/>
                    },
                    {
                        path : "admin-summary",
                        element : <AdminPermision><AdminSummary/></AdminPermision>
                    },
                    {
                        path : "myorders",
                        element : <MyOrders/>
                    },
                    {
                        path : "address",
                        element : <Address/>
                    },
                    {
                        path : "store-orders",
                        element : <AdminPermision><StoreOrders/></AdminPermision>
                    },
                    {
                        path : "order-tracking/:id",
                        element : <RiderTracking />
                    },
                    {
                        path : 'category',
                        element : <AdminPermision><CategoryPage/></AdminPermision>
                    },
                    {
                        path : "subcategory",
                        element : <AdminPermision><SubCategoryPage/></AdminPermision>
                    },
                    {
                        path : 'upload-product',
                        element : <AdminPermision><UploadProduct/></AdminPermision>
                    },
                    {
                        path : 'product',
                        element : <AdminPermision><ProductAdmin/></AdminPermision>
                    }
                ]
            },
            {
                path : "track/:orderId",
                element : <TrackingPage />
            },
            {
                path : ":category",
                children : [
                    {
                        path : ":subCategory",
                        element : <ProductListPage/>
                    }
                ]
            },
            {
                path : "product/:product",
                element : <ProductDisplayPage/>
            },
            {
                path : 'cart',
                element : <CartMobile/>
            },
            {
                path : "checkout",
                element : <CheckoutPage/>
            },
            {
                path : "success",
                element : <Success/>
            },
            {
                path : 'cancel',
                element : <Cancel/>
            }
        ]
    }
])

export default router;