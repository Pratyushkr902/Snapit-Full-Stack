import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { logout } from '../store/userSlice'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'
import Divider from '../components/Divider'
import { ACCESS_TOKEN_KEY } from '../constants/storageKeys'

const UserMenuMobile = () => {
  const user = useSelector((state) => state.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      const response = await Axios({ ...SummaryApi.logout })
      if (response.data.success) {
        dispatch(logout())
        // FIX: only clear auth tokens, not all localStorage (cart, prefs, FCM token etc.)
        localStorage.removeItem(ACCESS_TOKEN_KEY)
        localStorage.removeItem('refreshToken')
        toast.success(response.data.message)
        navigate("/")
      }
    } catch (error) {
      AxiosToastError(error)
    }
  }

  return (
    <div className='text-sm grid gap-1'>

      {/* USER INFO */}
      <div className='px-3 py-2'>
        <p className='font-semibold text-gray-800'>{user?.name || user?.mobile}</p>
        <p className='text-xs text-gray-400'>{user?.email}</p>
        {user?.role && (
          <span className='text-xs font-medium text-red-600'>
            {user?.role === "ADMIN"        ? "(Admin)"        :
             user?.role === "RIDER"        ? "(Rider)"        :
             user?.role === "SELLER"       ? "(Seller)"       :
             user?.role === "RESTO_SELLER" ? "(Resto Seller)" : ""}
          </span>
        )}
      </div>

      <Divider/>

      {/* ADMIN ONLY */}
      {user?.role === "ADMIN" && (
        <>
          <Link to={"/dashboard/admin-summary"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100 font-bold text-secondary-100'>Admin Dashboard</Link>
          <Link to={"/dashboard/category"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>Category</Link>
          <Link to={"/dashboard/subcategory"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>Sub Category</Link>
          <Link to={"/dashboard/upload-product"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>Upload Product</Link>
          <Link to={"/dashboard/refunds"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>Refunds</Link>
          <Link to={"/dashboard/product"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>Product</Link>
          {/* FIX: was '/dashboard/resto-dashboard' (RESTO_SELLER page) — admin needs restaurant-admin */}
          <Link to={"/dashboard/restaurant-admin"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>Resto Admin</Link>
          <Link to={"/dashboard/store-sellers"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>🏆 Store Rankings</Link>
          <Link to={"/dashboard/store-earnings"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>💰 Store Earnings</Link>
          <Divider/>
        </>
      )}

      {/* RIDER ACCESS */}
      {(user?.role === "RIDER" || user?.role === "ADMIN") && (
        <Link to={"/rider-panel"} className='px-3 py-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 font-bold text-blue-700 border-l-4 border-blue-600'>
          Rider Panel
        </Link>
      )}

      {/* SELLER ACCESS */}
      {(user?.role === "SELLER" || user?.role === "ADMIN") && (
        <Link to={"/dashboard/seller-dashboard"} className='px-3 py-2.5 rounded-lg bg-orange-50 hover:bg-orange-100 font-bold text-orange-700 border-l-4 border-orange-600'>
          Store Orders (Pack Items)
        </Link>
      )}

      {/* RESTO SELLER ACCESS */}
      {(user?.role === "RESTO_SELLER" || user?.role === "ADMIN") && (
        <Link to={"/dashboard/resto-dashboard"} className='px-3 py-2.5 rounded-lg bg-red-50 hover:bg-red-100 font-bold text-red-700 border-l-4 border-red-600'>
          🍽️ Resto Dashboard
        </Link>
      )}

      {/* COMMON LINKS */}
      <Link to={"/dashboard/profile"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>My Profile</Link>
      <Link to={"/dashboard/myorders"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>My Orders</Link>
      <Link to={"/wishlist"} className='px-3 py-2.5 rounded-lg hover:bg-red-50 flex items-center gap-1.5'>
        <span>❤️</span> My Wishlist
      </Link>
      <Link to={"/dashboard/address"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>Save Address</Link>

      <Divider/>

      {/* FEATURE LINKS */}
      <Link to={"/snapit-plus"} className='px-3 py-2.5 rounded-lg hover:bg-green-50 flex items-center gap-3 font-semibold text-green-800'>
        <span className='text-xl'>⭐</span>
        <div>
          <p className='leading-none text-sm'>Snapit Plus</p>
          <p className='text-xs text-gray-400 font-normal'>Membership & benefits</p>
        </div>
      </Link>
      <Link to={"/streak"} className='px-3 py-2.5 rounded-lg hover:bg-orange-50 flex items-center gap-3 font-semibold text-orange-700'>
        <span className='text-xl'>🔥</span>
        <div>
          <p className='leading-none text-sm'>Daily Streak</p>
          <p className='text-xs text-gray-400 font-normal'>Order daily, earn rewards</p>
        </div>
      </Link>
      <Link to={"/subscriptions"} className='px-3 py-2.5 rounded-lg hover:bg-blue-50 flex items-center gap-3 font-semibold text-blue-700'>
        <span className='text-xl'>📦</span>
        <div>
          <p className='leading-none text-sm'>My Subscriptions</p>
          <p className='text-xs text-gray-400 font-normal'>Manage recurring orders</p>
        </div>
      </Link>

      <Divider/>

      <button onClick={handleLogout} className='text-left px-3 py-2.5 rounded-lg hover:bg-orange-100 text-red-600 font-semibold'>
        Log Out
      </button>

    </div>
  )
}

export default UserMenuMobile
