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
    <div className='text-sm grid gap-1 p-2'>

      {/* USER INFO */}
      <div className='px-3 py-2'>
        <p className='font-semibold text-gray-800'>{user?.name || user?.mobile}</p>
        <p className='text-xs text-gray-400'>{user?.email}</p>
        {role && (
          <span className='text-xs font-bold text-red-600'>
            {role === "ADMIN"        ? "(Admin)"        :
             role === "SUPER_ADMIN"  ? "(Super Admin)"  :
             role === "RIDER"        ? "(Rider)"        :
             role === "SELLER"       ? "(Seller)"       :
             role === "RESTO_SELLER" ? "(Resto Seller)" : ""}
          </span>
        )}
      </div>

      <Divider/>

      {/* ADMIN & SUPER ADMIN ONLY */}
      {(role === "ADMIN" || role === "SUPER_ADMIN") && (
        <>
          <Link to={"/dashboard/store-orders"} className='px-3 py-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 font-bold text-emerald-800 border-l-4 border-emerald-500'>
            📦 Store Packing &amp; Live Orders
          </Link>
          <Link to={"/dashboard/rider-fleet"} className='px-3 py-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 font-bold text-blue-700 border-l-4 border-blue-600'>
            🛵 Live Rider Fleet Tracker
          </Link>
          <Link to={"/dashboard/marketing"} className='px-3 py-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 font-bold text-amber-800 border-l-4 border-amber-500'>
            📢 Marketing & Notification Hub
          </Link>
          <Link to={"/dashboard/treasury"} className='px-3 py-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 font-bold text-emerald-700 border-l-4 border-emerald-500'>
            💰 COD Treasury & Partner Split
          </Link>
          <Link to={"/dashboard/admin-summary"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100 font-bold text-secondary-100'>Admin Dashboard</Link>
          <Link to={"/dashboard/category"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>Category</Link>
          <Link to={"/dashboard/subcategory"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>Sub Category</Link>
          <Link to={"/dashboard/upload-product"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>Upload Product</Link>
          <Link to={"/dashboard/refunds"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>Refunds</Link>
          {role === "SUPER_ADMIN" && (
            <Link to={"/dashboard/super-admin"} className='px-3 py-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 font-bold text-purple-700 border-l-4 border-purple-500'>
              👑 Super Admin Panel
            </Link>
          )}
          <Link to={"/dashboard/product"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>Product</Link>
          <Link to={"/dashboard/restaurant-admin"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>Resto Admin</Link>
          <Link to={"/dashboard/store-sellers"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>🏆 Store Rankings</Link>
          <Link to={"/dashboard/campus-ambassadors"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>🎓 Campus Ambassadors</Link>
          <Link to={"/dashboard/store-earnings"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>💰 Store Earnings</Link>
          <Divider/>
        </>
      )}

      {/* RIDER ACCESS */}
      {(role === "RIDER" || role === "ADMIN" || role === "SUPER_ADMIN") && (
        <Link to={"/rider-panel"} className='px-3 py-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 font-bold text-blue-700 border-l-4 border-blue-600'>
          🛵 Rider Panel
        </Link>
      )}

      {/* SELLER ACCESS */}
      {role === "SELLER" && (
        <Link to={"/dashboard/seller-dashboard"} className='px-3 py-2.5 rounded-lg bg-orange-50 hover:bg-orange-100 font-bold text-orange-700 border-l-4 border-orange-600'>
          📦 Store Orders (Pack Items)
        </Link>
      )}

      {/* RESTO SELLER ACCESS */}
      {role === "RESTO_SELLER" && (
        <Link to={"/dashboard/resto-dashboard"} className='px-3 py-2.5 rounded-lg bg-red-50 hover:bg-red-100 font-bold text-red-700 border-l-4 border-red-600'>
          🍽️ Resto Dashboard
        </Link>
      )}

      {/* COMMON LINKS */}
      <Link to={"/dashboard/profile"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>My Profile</Link>
      <Link to={"/dashboard/myorders"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>My Orders</Link>
      <Link to={"/refer"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100 flex items-center gap-1.5'>
        <span>🎁</span> Refer & Earn
      </Link>
      <Link to={"/wallet"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100 flex items-center gap-1.5'>
        <span>💰</span> Wallet
      </Link>
      <Link to={"/wishlist"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100 flex items-center gap-1.5'>
        <span>❤️</span> My Wishlist
      </Link>
      <Link to={"/deals"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100 flex items-center gap-1.5'>
        <span>🏷️</span> All Deals & Offers
      </Link>
      <Link to={"/snapit-plus"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100 flex items-center gap-1.5'>
        <span>✨</span> Snapit Plus Membership
      </Link>
      <Link to={"/streak"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100 flex items-center gap-1.5'>
        <span>🔥</span> Daily Streak & Rewards
      </Link>
      <Link to={"/subscriptions"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100 flex items-center gap-1.5'>
        <span>📦</span> My Subscriptions
      </Link>
      <Link to={"/dashboard/address"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>Save Address</Link>

      <button onClick={handleLogout} className='text-left px-3 py-2.5 rounded-lg text-red-600 font-semibold hover:bg-red-50'>
        Log Out
      </button>

    </div>
  )
}

export default UserMenuMobile
