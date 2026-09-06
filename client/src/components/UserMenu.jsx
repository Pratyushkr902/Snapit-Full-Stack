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
    <div className='text-slate-800 dark:text-slate-100'>
        <div className='font-bold text-slate-900 dark:text-white'>My Account</div>
        <div className='text-sm flex items-center gap-2 mt-0.5'>
          <span className='max-w-52 text-ellipsis line-clamp-1 text-slate-700 dark:text-slate-200'>
            {user?.name || user?.mobile}
            <span className='ml-1 font-bold text-red-600 dark:text-red-400'>
              {role === "ADMIN"        ? "(Admin)"      :
               role === "SUPER_ADMIN"  ? "(Super Admin)":
               role === "RIDER"        ? "(Rider)"      :
               role === "SELLER"       ? "(Seller)"     :
               role === "RESTO_SELLER" ? "(Restaurant)" : ""}
            </span>
          </span>
          <Link onClick={handleClose} to={"/dashboard/profile"} className='hover:text-primary-200 text-slate-500 dark:text-slate-400'>
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
                  className='px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-bold text-emerald-800 dark:text-emerald-300 border-l-4 border-emerald-500 transition-colors'>
                  📦 Store Packing &amp; Live Orders
                </Link>
                <Link onClick={handleClose} to={"/dashboard/rider-fleet"}
                  className='px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-bold text-blue-700 dark:text-blue-300 border-l-4 border-blue-500 transition-colors'>
                  🛵 Live Rider Fleet Tracker
                </Link>
                <Link onClick={handleClose} to={"/dashboard/marketing"}
                  className='px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 font-bold text-amber-800 dark:text-amber-300 border-l-4 border-amber-500 transition-colors'>
                  📢 Marketing & Notification Hub
                </Link>
                <Link onClick={handleClose} to={"/dashboard/treasury"}
                  className='px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-bold text-emerald-700 dark:text-emerald-300 border-l-4 border-emerald-500 transition-colors'>
                  💰 COD Treasury & Partner Split
                </Link>
                <Link onClick={handleClose} to={"/dashboard/admin-summary"} className='px-2.5 py-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-slate-800 font-bold text-secondary-100 dark:text-amber-400 transition-colors'>Admin Dashboard</Link>
                <Link onClick={handleClose} to={"/dashboard/category"} className='px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition-colors'>Category</Link>
                <Link onClick={handleClose} to={"/dashboard/subcategory"} className='px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition-colors'>Sub Category</Link>
                <Link onClick={handleClose} to={"/dashboard/upload-product"} className='px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition-colors'>Upload Product</Link>
                <Link onClick={handleClose} to={"/dashboard/refunds"} className='px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition-colors'>Refunds</Link>
                {role === "SUPER_ADMIN" && (
                  <Link onClick={handleClose} to={"/dashboard/super-admin"}
                    className='px-2.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 font-bold text-purple-700 dark:text-purple-300 border-l-4 border-purple-500 transition-colors'>
                    👑 Super Admin Panel
                  </Link>
                )}
                <Link onClick={handleClose} to={"/dashboard/product"} className='px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition-colors'>Product</Link>
                {/* Admin can also manage restaurants */}
                <Link onClick={handleClose} to={"/dashboard/restaurant-admin"}
                  className='px-2.5 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/50 py-1 font-bold text-orange-700 dark:text-orange-300 border-l-4 border-orange-500 transition-colors'>
                  🍔 Restaurant Admin
                </Link>
                <Link onClick={handleClose} to={"/dashboard/store-sellers"}
                  className='px-2.5 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/50 py-1 font-bold text-orange-700 dark:text-orange-300 border-l-4 border-orange-500 transition-colors'>
                  🏪 Store Panel
                </Link>
                <Link onClick={handleClose} to={"/dashboard/campus-ambassadors"}
                  className='px-2.5 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/50 py-1 font-bold text-orange-700 dark:text-orange-300 border-l-4 border-orange-500 transition-colors'>
                  🎓 Campus Ambassadors
                </Link>
                <Link onClick={handleClose} to={"/dashboard/store-earnings"}
                  className='px-2.5 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/50 py-1 font-bold text-orange-700 dark:text-orange-300 border-l-4 border-orange-500 transition-colors'>
                  💰 Store Earnings
                </Link>
              </>
            )}

            {/* RIDER ACCESS */}
            {(role === "RIDER" || role === "ADMIN" || role === "SUPER_ADMIN") && (
              <Link onClick={handleClose} to={"/rider-panel"}
                className='px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-bold text-blue-700 dark:text-blue-300 border-l-4 border-blue-600 mb-1 transition-colors'>
                🛵 Rider Panel
              </Link>
            )}

            {/* SELLER ACCESS */}
            {role === "SELLER" && (
              <Link onClick={handleClose} to={"/dashboard/seller-dashboard"}
                className='px-2.5 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/50 font-bold text-orange-700 dark:text-orange-300 border-l-4 border-orange-600 mb-1 transition-colors'>
                🏪 Store Panel
              </Link>
            )}

            {/* RESTO SELLER ACCESS */}
            {role === "RESTO_SELLER" && (
              <Link onClick={handleClose} to={"/dashboard/resto-dashboard"}
                className='px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 font-bold text-red-700 dark:text-red-300 border-l-4 border-red-500 mb-1 transition-colors'>
                🍽️ My Restaurant
              </Link>
            )}

            {/* COMMON LINKS */}
            <Link onClick={handleClose} to={"/dashboard/myorders"} className='px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition-colors'>My Orders</Link>
            <Link onClick={handleClose} to={"/refer"} className='px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition-colors flex items-center gap-1.5'>
              <span>🎁</span> Refer &amp; Earn
            </Link>
            <Link onClick={handleClose} to={"/wishlist"} className='px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition-colors flex items-center gap-1.5'>
              <span>❤️</span> My Wishlist
            </Link>
            <Link onClick={handleClose} to={"/dashboard/address"} className='px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition-colors'>Save Address</Link>

            <Divider/>

            <Link onClick={handleClose} to={"/snapit-plus"} className='px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-slate-800 flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300 transition-colors'>
              <span>⭐</span>
              <div>
                <p className='leading-none'>Snapit Plus</p>
                <p className='text-[10px] text-slate-400 dark:text-slate-400 font-normal mt-0.5'>Membership & benefits</p>
              </div>
            </Link>
            <Link onClick={handleClose} to={"/streak"} className='px-2.5 py-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-slate-800 flex items-center gap-2 font-semibold text-orange-700 dark:text-orange-400 transition-colors'>
              <span>🔥</span>
              <div>
                <p className='leading-none'>Daily Streak</p>
                <p className='text-[10px] text-slate-400 dark:text-slate-400 font-normal mt-0.5'>Order daily, earn rewards</p>
              </div>
            </Link>
            <Link onClick={handleClose} to={"/subscriptions"} className='px-2.5 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-400 transition-colors'>
              <span>📦</span>
              <div>
                <p className='leading-none'>My Subscriptions</p>
                <p className='text-[10px] text-slate-400 dark:text-slate-400 font-normal mt-0.5'>Manage recurring orders</p>
              </div>
            </Link>

            <Divider/>

            <Link to="/privacy-policy"
              className='px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium transition-colors'
              onClick={handleClose}>
              🔒 Privacy Policy
            </Link>

            <button onClick={handleLogout} className='text-left px-2.5 py-1.5 rounded-lg text-red-600 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors'>Log Out</button>

        </div>
    </div>
  )
}

export default UserMenu