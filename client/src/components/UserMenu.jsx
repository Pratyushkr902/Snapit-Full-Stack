import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import Divider from './Divider'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { logout } from '../store/userSlice'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'
import { HiOutlineExternalLink } from "react-icons/hi";
import secureStorage from '../utils/secureStorage'
import ThemeToggle from './ThemeToggle'

const UserMenu = ({close}) => {
   const user = useSelector((state) => state.user)
   const role = user?.role?.replace(/['"]/g, '').trim().toUpperCase()
   const dispatch = useDispatch()
   const navigate = useNavigate()

   const handleLogout = async () => {
        try {
          if (close) close()
          dispatch(logout())
          await secureStorage.removeItem('accessToken').catch(() => {})
          await secureStorage.removeItem('refreshToken').catch(() => {})
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('user')
          sessionStorage.clear()
          Axios({ ...SummaryApi.logout }).catch(() => {})
          toast.success("Logged out successfully")
          navigate("/login", { replace: true })
        } catch (error) {
          if (close) close()
          dispatch(logout())
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          navigate("/login", { replace: true })
        }
   }

   const handleClose = () => {
      if (close) close()
   }

  return (
    <div>
        <div className='font-semibold'>My Account</div>
        <div className='text-sm flex items-center gap-2'>
          <span className='max-w-52 text-ellipsis line-clamp-1'>
            {user?.name || user?.mobile}
            <span className='ml-1 font-medium text-red-600'>
              {role === "ADMIN"        ? "(Admin)"      :
               role === "SUPER_ADMIN"  ? "(Super Admin)":
               role === "RIDER"        ? "(Rider)"      :
               role === "SELLER"       ? "(Seller)"     :
               role === "RESTO_SELLER" ? "(Restaurant)" : ""}
            </span>
          </span>
          <Link onClick={handleClose} to={"/dashboard/profile"} className='hover:text-primary-200'>
            <HiOutlineExternalLink size={15}/>
          </Link>
        </div>

        <Divider/>

        <div className='my-1'>
          <ThemeToggle variant="row" />
        </div>

        <Divider/>

        <div className='text-sm grid gap-1'>

            {/* ADMIN ONLY LINKS */}
            {(role === "ADMIN" || role === "SUPER_ADMIN") && (
              <>
                <Link onClick={handleClose} to={"/dashboard/store-orders"}
                  className='px-2 bg-emerald-50 hover:bg-emerald-100 py-1 font-bold text-emerald-800 border-l-4 border-emerald-500'>
                  📦 Store Packing &amp; Live Orders
                </Link>
                <Link onClick={handleClose} to={"/dashboard/rider-fleet"}
                  className='px-2 bg-blue-50 hover:bg-blue-100 py-1 font-bold text-blue-700 border-l-4 border-blue-500'>
                  🛵 Live Rider Fleet Tracker
                </Link>
                <Link onClick={handleClose} to={"/dashboard/marketing"}
                  className='px-2 bg-amber-50 hover:bg-amber-100 py-1 font-bold text-amber-800 border-l-4 border-amber-500'>
                  📢 Marketing & Notification Hub
                </Link>
                <Link onClick={handleClose} to={"/dashboard/treasury"}
                  className='px-2 bg-emerald-50 hover:bg-emerald-100 py-1 font-bold text-emerald-700 border-l-4 border-emerald-500'>
                  💰 COD Treasury & Partner Split
                </Link>
                <Link onClick={handleClose} to={"/dashboard/admin-summary"} className='px-2 hover:bg-orange-200 py-1 font-bold text-secondary-100'>Admin Dashboard</Link>
                <Link onClick={handleClose} to={"/dashboard/category"} className='px-2 hover:bg-orange-200 py-1'>Category</Link>
                <Link onClick={handleClose} to={"/dashboard/subcategory"} className='px-2 hover:bg-orange-200 py-1'>Sub Category</Link>
                <Link onClick={handleClose} to={"/dashboard/upload-product"} className='px-2 hover:bg-orange-200 py-1'>Upload Product</Link>
                <Link onClick={handleClose} to={"/dashboard/refunds"} className='px-2 hover:bg-orange-200 py-1'>Refunds</Link>
                {role === "SUPER_ADMIN" && (
                  <Link onClick={handleClose} to={"/dashboard/super-admin"}
                    className='px-2 bg-purple-50 hover:bg-purple-100 py-1 font-bold text-purple-700 border-l-4 border-purple-500'>
                    👑 Super Admin Panel
                  </Link>
                )}
                <Link onClick={handleClose} to={"/dashboard/product"} className='px-2 hover:bg-orange-200 py-1'>Product</Link>
                {/* Admin can also manage restaurants */}
                <Link onClick={handleClose} to={"/dashboard/restaurant-admin"}
                  className='px-2 bg-orange-50 hover:bg-orange-100 py-1 font-bold text-orange-700 border-l-4 border-orange-500'>
                  🍔 Restaurant Admin
                </Link>
                <Link onClick={handleClose} to={"/dashboard/store-sellers"}
                  className='px-2 bg-orange-50 hover:bg-orange-100 py-1 font-bold text-orange-700 border-l-4 border-orange-500'>
                  🏪 Store Panel
                </Link>
                <Link onClick={handleClose} to={"/dashboard/campus-ambassadors"}
                  className='px-2 bg-orange-50 hover:bg-orange-100 py-1 font-bold text-orange-700 border-l-4 border-orange-500'>
                  🎓 Campus Ambassadors
                </Link>
                <Link onClick={handleClose} to={"/dashboard/store-earnings"}
                  className='px-2 bg-orange-50 hover:bg-orange-100 py-1 font-bold text-orange-700 border-l-4 border-orange-500'>
                  💰 Store Earnings
                </Link>
              </>
            )}

            {/* RIDER ACCESS */}
            {(role === "RIDER" || role === "ADMIN" || role === "SUPER_ADMIN") && (
              <Link onClick={handleClose} to={"/rider-panel"}
                className='px-2 bg-blue-50 hover:bg-blue-100 py-1 font-bold text-blue-700 border-l-4 border-blue-600 mb-1'>
                Rider Panel
              </Link>
            )}

            {/* SELLER ACCESS — ADMIN uses the dedicated per-store panel above instead,
                since the seller dashboard's own-store filter is bypassed for ADMIN
                (see getSellerOrdersController), which used to dump every store's
                orders/products into one mixed view for admin accounts. */}
            {role === "SELLER" && (
              <Link onClick={handleClose} to={"/dashboard/seller-dashboard"}
                className='px-2 bg-orange-50 hover:bg-orange-100 py-1 font-bold text-orange-700 border-l-4 border-orange-600 mb-1'>
                🏪 Store Panel
              </Link>
            )}

            {/* RESTO SELLER ACCESS */}
            {role === "RESTO_SELLER" && (
              <Link onClick={handleClose} to={"/dashboard/resto-dashboard"}
                className='px-2 bg-red-50 hover:bg-red-100 py-1 font-bold text-red-700 border-l-4 border-red-500 mb-1'>
                🍽️ My Restaurant
              </Link>
            )}

            {/* COMMON LINKS */}
            <Link onClick={handleClose} to={"/dashboard/myorders"} className='px-2 hover:bg-orange-200 py-1'>My Orders</Link>
            <Link onClick={handleClose} to={"/refer"} className='px-2 hover:bg-orange-200 py-1 flex items-center gap-1.5'>
              <span>🎁</span> Refer &amp; Earn
            </Link>
            <Link onClick={handleClose} to={"/wishlist"} className='px-2 hover:bg-red-50 py-1 flex items-center gap-1.5'>
              <span>❤️</span> My Wishlist
            </Link>
            <Link onClick={handleClose} to={"/dashboard/address"} className='px-2 hover:bg-orange-200 py-1'>Save Address</Link>

            <Divider/>

            <Link onClick={handleClose} to={"/snapit-plus"} className='px-2 hover:bg-green-50 py-1 flex items-center gap-2 font-semibold text-green-800'>
              <span>⭐</span>
              <div>
                <p className='leading-none'>Snapit Plus</p>
                <p className='text-[10px] text-gray-400 font-normal'>Membership & benefits</p>
              </div>
            </Link>
            <Link onClick={handleClose} to={"/streak"} className='px-2 hover:bg-orange-50 py-1 flex items-center gap-2 font-semibold text-orange-700'>
              <span>🔥</span>
              <div>
                <p className='leading-none'>Daily Streak</p>
                <p className='text-[10px] text-gray-400 font-normal'>Order daily, earn rewards</p>
              </div>
            </Link>
            <Link onClick={handleClose} to={"/subscriptions"} className='px-2 hover:bg-blue-50 py-1 flex items-center gap-2 font-semibold text-blue-700'>
              <span>📦</span>
              <div>
                <p className='leading-none'>My Subscriptions</p>
                <p className='text-[10px] text-gray-400 font-normal'>Manage recurring orders</p>
              </div>
            </Link>

            <Divider/>

            <a href="https://snapit.pages.dev/privacy-policy.html" target="_blank" rel="noreferrer"
              className='px-2 hover:bg-gray-100 py-1 flex items-center gap-1.5 text-gray-600'
              onClick={handleClose}>
              🔒 Privacy Policy
            </a>

            <button onClick={handleLogout} className='text-left px-2 hover:bg-orange-200 py-1'>Log Out</button>

        </div>
    </div>
  )
}

export default UserMenu