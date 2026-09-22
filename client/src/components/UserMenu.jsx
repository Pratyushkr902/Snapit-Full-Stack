import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import Divider from './Divider'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { logout } from '../store/userSlice'
import toast from 'react-hot-toast'
import secureStorage from '../utils/secureStorage'
import ThemeToggle from './ThemeToggle'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import {
  FiShoppingBag,
  FiHeart,
  FiMapPin,
  FiRepeat,
  FiCreditCard,
  FiGift,
  FiZap,
  FiPercent,
  FiAward,
  FiTruck,
  FiPackage,
  FiUser,
  FiStar,
  FiShield,
  FiLogOut,
  FiChevronRight,
  FiGrid,
  FiUpload,
  FiRefreshCw,
  FiTrendingUp,
  FiHome,
  FiLayers,
  FiDollarSign
} from 'react-icons/fi'

const UserMenu = ({ close }) => {
  const user = useSelector((state) => state.user)
  const role = (user?.role || '').replace(/['"]/g, '').trim().toUpperCase()
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
    } catch {
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

  const initials = (user?.name || user?.mobile || 'S')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className='text-slate-800 dark:text-slate-100 flex flex-col max-h-[82vh]'>
      {/* ── TOP HEADER / USER INFO ── */}
      <div className='flex-shrink-0 pb-2'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex items-center gap-2.5 min-w-0'>
            <div className='w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0'>
              {initials}
            </div>
            <div className='min-w-0'>
              <h3 className='font-extrabold text-sm text-slate-900 dark:text-white leading-tight truncate'>
                {user?.name || user?.mobile || 'Snapit Customer'}
              </h3>
              <p className='text-[11px] text-slate-400 font-medium truncate'>
                {user?.mobile ? `+91 ${String(user.mobile).slice(-10)}` : user?.email || 'Snapit Account'}
              </p>
            </div>
          </div>
          {role && (
            <span className='text-[9px] uppercase font-black px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shrink-0'>
              {role === "ADMIN" ? "Admin" :
               role === "SUPER_ADMIN" ? "Super Admin" :
               role === "RIDER" ? "Rider" :
               role === "SELLER" ? "Seller" :
               role === "RESTO_SELLER" ? "Resto" : role}
            </span>
          )}
        </div>

        {/* Quick Wallet Row */}
        <Link
          onClick={handleClose}
          to='/wallet'
          className='mt-2.5 flex items-center justify-between p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 hover:bg-emerald-100/60 transition-colors'
        >
          <div className='flex items-center gap-2'>
            <div className='w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs shrink-0'>
              <FiCreditCard size={12} />
            </div>
            <span className='text-xs font-bold text-emerald-900 dark:text-emerald-200'>Snapit Wallet</span>
          </div>
          <span className='text-xs font-black text-emerald-700 dark:text-emerald-300'>
            {DisplayPriceInRupees(user?.walletBalance || 0)} →
          </span>
        </Link>

        <div className='my-2'>
          <ThemeToggle variant="row" />
        </div>

        <Divider />
      </div>

      {/* ── SCROLLABLE LINKS CONTAINER ── */}
      <div className='text-xs grid gap-1 overflow-y-auto overscroll-contain scrollbarCustom pr-1 my-1'>

        {/* ADMIN ONLY SECTION */}
        {(role === "ADMIN" || role === "SUPER_ADMIN") && (
          <>
            <p className='text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 px-1 pt-1'>
              Admin & Operations
            </p>
            <Link onClick={handleClose} to="/dashboard/store-orders"
              className='flex items-center justify-between px-2.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-bold text-emerald-800 dark:text-emerald-300 border-l-3 border-emerald-500 transition-colors'>
              <div className='flex items-center gap-2'>
                <FiPackage size={14} />
                <span>Store Packing &amp; Live Orders</span>
              </div>
              <FiChevronRight size={13} />
            </Link>
            <Link onClick={handleClose} to="/dashboard/rider-fleet"
              className='flex items-center justify-between px-2.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-bold text-blue-700 dark:text-blue-300 border-l-3 border-blue-500 transition-colors'>
              <div className='flex items-center gap-2'>
                <FiTruck size={14} />
                <span>Live Rider Fleet Tracker</span>
              </div>
              <FiChevronRight size={13} />
            </Link>
            <Link onClick={handleClose} to="/dashboard/rider-fleet?tab=applications"
              className='flex items-center justify-between px-2.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 font-bold text-teal-800 dark:text-teal-300 border-l-3 border-teal-500 transition-colors'>
              <div className='flex items-center gap-2'>
                <FiUser size={14} />
                <span>Rider Applications</span>
              </div>
              <span className='text-[9px] bg-teal-200 dark:bg-teal-800 text-teal-950 dark:text-teal-100 px-1.5 py-0.5 rounded-full font-black'>
                Review
              </span>
            </Link>
            <Link onClick={handleClose} to="/dashboard/marketing"
              className='flex items-center justify-between px-2.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 font-bold text-amber-800 dark:text-amber-300 border-l-3 border-amber-500 transition-colors'>
              <div className='flex items-center gap-2'>
                <FiTrendingUp size={14} />
                <span>Marketing & Notification Hub</span>
              </div>
              <FiChevronRight size={13} />
            </Link>
            <Link onClick={handleClose} to="/dashboard/treasury"
              className='flex items-center justify-between px-2.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-bold text-emerald-700 dark:text-emerald-300 border-l-3 border-emerald-500 transition-colors'>
              <div className='flex items-center gap-2'>
                <FiDollarSign size={14} />
                <span>COD Treasury & Partner Split</span>
              </div>
              <FiChevronRight size={13} />
            </Link>
            <Link onClick={handleClose} to="/dashboard/admin-summary" className='flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 transition-colors'>
              <div className='flex items-center gap-2'>
                <FiGrid size={14} />
                <span>Admin Dashboard</span>
              </div>
              <FiChevronRight size={13} />
            </Link>
            <Link onClick={handleClose} to="/dashboard/reset-pin"
              className='flex items-center justify-between px-2.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 font-bold text-rose-700 dark:text-rose-300 border-l-3 border-rose-500 transition-colors'>
              <div className='flex items-center gap-2'>
                <FiRefreshCw size={14} />
                <span>Reset Customer PIN</span>
              </div>
              <FiChevronRight size={13} />
            </Link>
            <Link onClick={handleClose} to="/dashboard/category" className='flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors'>
              <div className='flex items-center gap-2'><FiLayers size={13} /><span>Category</span></div>
              <FiChevronRight size={12} />
            </Link>
            <Link onClick={handleClose} to="/dashboard/subcategory" className='flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors'>
              <div className='flex items-center gap-2'><FiLayers size={13} /><span>Sub Category</span></div>
              <FiChevronRight size={12} />
            </Link>
            <Link onClick={handleClose} to="/dashboard/upload-product" className='flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors'>
              <div className='flex items-center gap-2'><FiUpload size={13} /><span>Upload Product</span></div>
              <FiChevronRight size={12} />
            </Link>
            <Link onClick={handleClose} to="/dashboard/product" className='flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors'>
              <div className='flex items-center gap-2'><FiPackage size={13} /><span>Product Inventory</span></div>
              <FiChevronRight size={12} />
            </Link>
            <Link onClick={handleClose} to="/dashboard/refunds" className='flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors'>
              <div className='flex items-center gap-2'><FiCreditCard size={13} /><span>Refunds</span></div>
              <FiChevronRight size={12} />
            </Link>
            {role === "SUPER_ADMIN" && (
              <Link onClick={handleClose} to="/dashboard/super-admin"
                className='flex items-center justify-between px-2.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 font-bold text-purple-700 dark:text-purple-300 border-l-3 border-purple-500 transition-colors'>
                <div className='flex items-center gap-2'><FiShield size={14} /><span>Super Admin Panel</span></div>
                <FiChevronRight size={13} />
              </Link>
            )}
            <Link onClick={handleClose} to="/dashboard/restaurant-admin"
              className='flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors'>
              <div className='flex items-center gap-2'><FiHome size={13} /><span>Restaurant Admin</span></div>
              <FiChevronRight size={12} />
            </Link>
            <Link onClick={handleClose} to="/dashboard/store-sellers"
              className='flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors'>
              <div className='flex items-center gap-2'><FiTrendingUp size={13} /><span>Store Panel</span></div>
              <FiChevronRight size={12} />
            </Link>
            <Link onClick={handleClose} to="/dashboard/campus-ambassadors"
              className='flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors'>
              <div className='flex items-center gap-2'><FiAward size={13} /><span>Campus Ambassadors</span></div>
              <FiChevronRight size={12} />
            </Link>
            <Link onClick={handleClose} to="/dashboard/store-earnings"
              className='flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors'>
              <div className='flex items-center gap-2'><FiDollarSign size={13} /><span>Store Earnings</span></div>
              <FiChevronRight size={12} />
            </Link>
            <Divider />
          </>
        )}

        {/* RIDER ACCESS */}
        {(role === "RIDER" || role === "ADMIN" || role === "SUPER_ADMIN") && (
          <Link onClick={handleClose} to="/rider-panel"
            className='flex items-center justify-between px-2.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-bold text-blue-700 dark:text-blue-300 border-l-3 border-blue-600 transition-colors'>
            <div className='flex items-center gap-2'>
              <FiTruck size={14} />
              <span>Rider Panel</span>
            </div>
            <FiChevronRight size={13} />
          </Link>
        )}

        {/* SELLER ACCESS */}
        {role === "SELLER" && (
          <Link onClick={handleClose} to="/dashboard/seller-dashboard"
            className='flex items-center justify-between px-2.5 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/50 font-bold text-orange-700 dark:text-orange-300 border-l-3 border-orange-600 transition-colors'>
            <div className='flex items-center gap-2'>
              <FiPackage size={14} />
              <span>Store Orders (Pack Items)</span>
            </div>
            <FiChevronRight size={13} />
          </Link>
        )}

        {/* RESTO SELLER ACCESS */}
        {role === "RESTO_SELLER" && (
          <Link onClick={handleClose} to="/dashboard/resto-dashboard"
            className='flex items-center justify-between px-2.5 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 font-bold text-red-700 dark:text-red-300 border-l-3 border-red-500 transition-colors'>
            <div className='flex items-center gap-2'>
              <FiHome size={14} />
              <span>Restaurant Dashboard</span>
            </div>
            <FiChevronRight size={13} />
          </Link>
        )}

        {/* COMMON / CUSTOMER LINKS */}
        <p className='text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 pt-1'>
          Your Information
        </p>
        <Link onClick={handleClose} to="/dashboard/myorders" className='flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold transition-colors'>
          <div className='flex items-center gap-2'><FiShoppingBag size={14} /><span>My Orders</span></div>
          <FiChevronRight size={13} className='text-slate-400' />
        </Link>
        <Link onClick={handleClose} to="/wishlist" className='flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold transition-colors'>
          <div className='flex items-center gap-2'><FiHeart size={14} /><span>My Wishlist</span></div>
          <FiChevronRight size={13} className='text-slate-400' />
        </Link>
        <Link onClick={handleClose} to="/subscriptions" className='flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold transition-colors'>
          <div className='flex items-center gap-2'><FiRepeat size={14} /><span>My Subscriptions</span></div>
          <FiChevronRight size={13} className='text-slate-400' />
        </Link>
        <Link onClick={handleClose} to="/dashboard/address" className='flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold transition-colors'>
          <div className='flex items-center gap-2'><FiMapPin size={14} /><span>Saved Addresses</span></div>
          <FiChevronRight size={13} className='text-slate-400' />
        </Link>

        <Divider />

        <p className='text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 pt-1'>
          Rewards & Offers
        </p>
        <Link onClick={handleClose} to="/snapit-plus" className='flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-800 dark:text-amber-300 font-semibold transition-colors'>
          <div className='flex items-center gap-2'>
            <FiAward size={14} />
            <span>Snapit Plus Membership</span>
          </div>
          <span className='text-[9px] font-black bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 px-1.5 py-0.5 rounded-full'>
            VIP
          </span>
        </Link>
        <Link onClick={handleClose} to="/streak" className='flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-slate-800 text-orange-700 dark:text-orange-400 font-semibold transition-colors'>
          <div className='flex items-center gap-2'>
            <FiZap size={14} />
            <span>Daily Streak &amp; Rewards</span>
          </div>
          <FiChevronRight size={13} className='text-slate-400' />
        </Link>
        <Link onClick={handleClose} to="/refer" className='flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-slate-800 text-emerald-800 dark:text-emerald-300 font-semibold transition-colors'>
          <div className='flex items-center gap-2'>
            <FiGift size={14} />
            <span>Refer &amp; Earn</span>
          </div>
          <span className='text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 px-1.5 py-0.5 rounded-full'>
            10 Coins
          </span>
        </Link>
        <Link onClick={handleClose} to="/deals" className='flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold transition-colors'>
          <div className='flex items-center gap-2'><FiPercent size={14} /><span>All Deals &amp; Offers</span></div>
          <FiChevronRight size={13} className='text-slate-400' />
        </Link>

        <Divider />

        {/* RIDER ONBOARDING (Deliver with Snapit) */}
        {(!role || role === "USER") && (
          <Link onClick={handleClose} to="/rider/join"
            className='flex items-center justify-between px-2.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-bold text-emerald-800 dark:text-emerald-300 border-l-3 border-emerald-500 transition-colors my-0.5'>
            <div className='flex items-center gap-2'>
              <FiTruck size={14} />
              <span>Deliver with Snapit</span>
            </div>
            <span className='text-[9px] bg-emerald-200 dark:bg-emerald-800 text-emerald-950 dark:text-emerald-100 px-1.5 py-0.5 rounded-full font-black'>
              Earn Daily
            </span>
          </Link>
        )}

        <button
          type='button'
          onClick={() => {
            handleClose?.()
            window.dispatchEvent(new CustomEvent('open-smart-rating'))
          }}
          className='w-full text-left px-2.5 py-1.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-bold text-xs flex items-center justify-between transition-colors my-0.5'
        >
          <div className='flex items-center gap-2'>
            <FiStar size={13} />
            <span>Rate Us on Play Store</span>
          </div>
          <span className='text-[9px] bg-amber-200 dark:bg-amber-800 text-amber-950 dark:text-amber-100 px-1.5 py-0.5 rounded-full font-black'>
            5★
          </span>
        </button>

        <Link onClick={handleClose} to="/privacy-policy"
          className='flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium transition-colors'>
          <div className='flex items-center gap-2'><FiShield size={13} /><span>Privacy Policy</span></div>
          <FiChevronRight size={12} />
        </Link>
      </div>

      {/* ── FOOTER LOGOUT ── */}
      <div className='flex-shrink-0 pt-2 border-t border-slate-100 dark:border-slate-800 mt-1'>
        <button
          type='button'
          onClick={handleLogout}
          className='w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors active:scale-95'
        >
          <div className='flex items-center gap-2'>
            <FiLogOut size={14} />
            <span>Log Out</span>
          </div>
          <FiChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}

export default UserMenu