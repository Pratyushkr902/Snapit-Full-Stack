import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { logout, setUserDetails } from '../store/userSlice'
import fetchUserDetails from '../utils/fetchUserDetails'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'
import Divider from '../components/Divider'
import { ACCESS_TOKEN_KEY } from '../constants/storageKeys'

import secureStorage from '../utils/secureStorage'
import ThemeToggle from '../components/ThemeToggle'

const UserMenuMobile = () => {
  const user = useSelector((state) => state.user)
  const role = (user?.role || '').replace(/['"]/g, '').trim().toUpperCase()
  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    fetchUserDetails().then((userData) => {
      if (userData?.success && userData?.data) {
        dispatch(setUserDetails(userData.data))
      }
    }).catch(() => {})
  }, [dispatch])

  const handleLogout = async () => {
    try {
      // 1. Immediately reset Redux state and all local/secure storage
      dispatch(logout())
      await secureStorage.removeItem('accessToken').catch(() => {})
      await secureStorage.removeItem('refreshToken').catch(() => {})
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      sessionStorage.clear()

      // 2. Fire backend logout in background
      Axios({ ...SummaryApi.logout }).catch(() => {})

      toast.success("Logged out successfully")
      navigate("/login", { replace: true })
    } catch (error) {
      dispatch(logout())
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      navigate("/login", { replace: true })
    }
  }

  return (
    <div className='text-sm grid gap-1 p-3 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 min-h-screen transition-colors'>

      {/* USER INFO */}
      <div className='p-3.5 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-100 dark:border-slate-800/80 mb-1'>
        <p className='font-bold text-slate-900 dark:text-white text-base'>{user?.name || user?.mobile}</p>
        <p className='text-xs text-slate-500 dark:text-slate-400 mt-0.5'>{user?.email}</p>
        {role && (
          <span className='inline-block mt-1 text-xs font-bold text-red-600 dark:text-red-400'>
            {role === "ADMIN"        ? "(Admin)"        :
             role === "SUPER_ADMIN"  ? "(Super Admin)"  :
             role === "RIDER"        ? "(Rider)"        :
             role === "SELLER"       ? "(Seller)"       :
             role === "RESTO_SELLER" ? "(Resto Seller)" : ""}
          </span>
        )}
      </div>

      <Divider/>

      {/* Dark Mode Toggle (Zomato-style row) */}
      <div className='my-1 px-1'>
        <ThemeToggle variant="row" />
      </div>

      <Divider/>

      {/* ADMIN & SUPER ADMIN ONLY */}
      {(role === "ADMIN" || role === "SUPER_ADMIN") && (
        <>
          <Link to={"/dashboard/store-orders"} className='px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-bold text-emerald-800 dark:text-emerald-300 border-l-4 border-emerald-500 transition-colors'>
            📦 Store Packing &amp; Live Orders
          </Link>
          <Link to={"/dashboard/rider-fleet"} className='px-3 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-bold text-blue-700 dark:text-blue-300 border-l-4 border-blue-600 transition-colors'>
            🛵 Live Rider Fleet Tracker
          </Link>
          <Link to={"/dashboard/marketing"} className='px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 font-bold text-amber-800 dark:text-amber-300 border-l-4 border-amber-500 transition-colors'>
            📢 Marketing & Notification Hub
          </Link>
          <Link to={"/dashboard/treasury"} className='px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-bold text-emerald-700 dark:text-emerald-300 border-l-4 border-emerald-500 transition-colors'>
            💰 COD Treasury & Partner Split
          </Link>
          <Link to={"/dashboard/admin-summary"} className='px-3 py-2.5 rounded-xl hover:bg-orange-50 dark:hover:bg-slate-900 font-bold text-secondary-100 dark:text-amber-400 transition-colors'>Admin Dashboard</Link>
          <Link to={"/dashboard/category"} className='px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium transition-colors'>Category</Link>
          <Link to={"/dashboard/subcategory"} className='px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium transition-colors'>Sub Category</Link>
          <Link to={"/dashboard/upload-product"} className='px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium transition-colors'>Upload Product</Link>
          <Link to={"/dashboard/refunds"} className='px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium transition-colors'>Refunds</Link>
          {role === "SUPER_ADMIN" && (
            <Link to={"/dashboard/super-admin"} className='px-3 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 font-bold text-purple-700 dark:text-purple-300 border-l-4 border-purple-500 transition-colors'>
              👑 Super Admin Panel
            </Link>
          )}
          <Link to={"/dashboard/product"} className='px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium transition-colors'>Product</Link>
          <Link to={"/dashboard/restaurant-admin"} className='px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium transition-colors'>Resto Admin</Link>
          <Link to={"/dashboard/store-sellers"} className='px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium transition-colors'>🏆 Store Rankings</Link>
          <Link to={"/dashboard/campus-ambassadors"} className='px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium transition-colors'>🎓 Campus Ambassadors</Link>
          <Link to={"/dashboard/store-earnings"} className='px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium transition-colors'>💰 Store Earnings</Link>
          <Divider/>
        </>
      )}

      {/* RIDER ACCESS */}
      {(role === "RIDER" || role === "ADMIN" || role === "SUPER_ADMIN") && (
        <Link to={"/rider-panel"} className='px-3 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-bold text-blue-700 dark:text-blue-300 border-l-4 border-blue-600 transition-colors'>
          🛵 Rider Panel
        </Link>
      )}

      {/* SELLER ACCESS */}
      {role === "SELLER" && (
        <Link to={"/dashboard/seller-dashboard"} className='px-3 py-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/50 font-bold text-orange-700 dark:text-orange-300 border-l-4 border-orange-600 transition-colors'>
          📦 Store Orders (Pack Items)
        </Link>
      )}

      {/* RESTO SELLER ACCESS */}
      {role === "RESTO_SELLER" && (
        <Link to={"/dashboard/resto-dashboard"} className='px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 font-bold text-red-700 dark:text-red-300 border-l-4 border-red-600 transition-colors'>
          🍽️ Resto Dashboard
        </Link>
      )}

      {/* COMMON LINKS */}
      <Link to={"/dashboard/profile"} className='px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium transition-colors'>My Profile</Link>
      <Link to={"/dashboard/myorders"} className='px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium transition-colors'>My Orders</Link>
      <Link to={"/refer"} className='px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium transition-colors flex items-center gap-1.5'>
        <span>🎁</span> Refer & Earn
      </Link>
      <Link to={"/wallet"} className='px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium transition-colors flex items-center gap-1.5'>
        <span>💰</span> Wallet
      </Link>
      <Link to={"/wishlist"} className='px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium transition-colors flex items-center gap-1.5'>
        <span>❤️</span> My Wishlist
      </Link>
      <Link to={"/deals"} className='px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium transition-colors flex items-center gap-1.5'>
        <span>🏷️</span> All Deals & Offers
      </Link>
      <Link to={"/snapit-plus"} className='px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium transition-colors flex items-center gap-1.5'>
        <span>✨</span> Snapit Plus Membership
      </Link>
      <Link to={"/streak"} className='px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium transition-colors flex items-center gap-1.5'>
        <span>🔥</span> Daily Streak & Rewards
      </Link>
      <Link to={"/subscriptions"} className='px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium transition-colors flex items-center gap-1.5'>
        <span>📦</span> My Subscriptions
      </Link>
      <Link to={"/dashboard/address"} className='px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium transition-colors'>Save Address</Link>
      <Link to={"/privacy-policy"} className='px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium transition-colors flex items-center gap-1.5'>
        <span>🔒</span> Privacy Policy
      </Link>

      <button onClick={handleLogout} className='text-left px-3 py-2.5 rounded-xl text-red-600 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors'>
        Log Out
      </button>

    </div>
  )
}

export default UserMenuMobile
