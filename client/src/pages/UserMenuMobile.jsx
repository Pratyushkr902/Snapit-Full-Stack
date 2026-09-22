import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { logout, setUserDetails } from '../store/userSlice'
import fetchUserDetails from '../utils/fetchUserDetails'
import toast from 'react-hot-toast'
import secureStorage from '../utils/secureStorage'
import ThemeToggle from '../components/ThemeToggle'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { CURRENT_APP_VERSION, CURRENT_VERSION_CODE, PLAY_STORE_URL } from '../constants/appVersion'
import {
  FiShoppingBag,
  FiHeart,
  FiMapPin,
  FiRepeat,
  FiFileText,
  FiCreditCard,
  FiGift,
  FiZap,
  FiPercent,
  FiAward,
  FiTruck,
  FiPackage,
  FiUser,
  FiShare2,
  FiStar,
  FiShield,
  FiLogOut,
  FiChevronRight,
  FiHelpCircle,
  FiCopy,
  FiCheck,
  FiGrid,
  FiUpload,
  FiRefreshCw,
  FiTrendingUp,
  FiHome,
  FiLayers,
  FiDollarSign
} from 'react-icons/fi'
import { IoArrowBack } from 'react-icons/io5'
import { FaWhatsapp } from 'react-icons/fa'

const UserMenuMobile = () => {
  const user = useSelector((state) => state.user)
  const role = (user?.role || '').replace(/['"]/g, '').trim().toUpperCase()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [copiedVersion, setCopiedVersion] = useState(false)
  const [versionInfo, setVersionInfo] = useState({
    hasUpdate: false,
    latestVersion: CURRENT_APP_VERSION,
    playStoreUrl: PLAY_STORE_URL
  })

  useEffect(() => {
    // Check if a newer version is live on Play Store
    Axios({ url: '/api/app-version', method: 'GET' })
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          const { latestVersionCode, latestVersion, playStoreUrl } = res.data.data
          const isNewer = Number(latestVersionCode) > CURRENT_VERSION_CODE
          setVersionInfo({
            hasUpdate: isNewer,
            latestVersion: latestVersion || CURRENT_APP_VERSION,
            playStoreUrl: playStoreUrl || PLAY_STORE_URL
          })
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchUserDetails().then((userData) => {
      if (userData?.success && userData?.data) {
        dispatch(setUserDetails(userData.data))
      }
    }).catch(() => {})
  }, [dispatch])

  const handleLogout = async () => {
    try {
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
      dispatch(logout())
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      navigate("/login", { replace: true })
    }
  }

  const handleShareApp = async () => {
    const shareData = {
      title: 'Snapit - 10 Min Grocery & Food Delivery',
      text: 'Get fresh groceries, food, and daily essentials delivered in 10 minutes with Snapit!',
      url: 'https://snapit.pages.dev'
    }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        // User cancelled share
      }
    } else {
      navigator.clipboard?.writeText(shareData.url)
      toast.success('App link copied to clipboard!')
    }
  }

  const handleUpdateClick = () => {
    if (versionInfo.hasUpdate) {
      window.open(versionInfo.playStoreUrl, '_blank')
    } else {
      navigator.clipboard?.writeText(`Snapit v${CURRENT_APP_VERSION} (Build ${CURRENT_VERSION_CODE})`)
      setCopiedVersion(true)
      toast.success(`App is up to date (v${CURRENT_APP_VERSION})`)
      setTimeout(() => setCopiedVersion(false), 2000)
    }
  }

  const handleCopyVersion = () => {
    navigator.clipboard?.writeText(`Snapit v${CURRENT_APP_VERSION} (Build ${CURRENT_VERSION_CODE})`)
    setCopiedVersion(true)
    toast.success(`Copied Snapit v${CURRENT_APP_VERSION}`)
    setTimeout(() => setCopiedVersion(false), 2000)
  }

  const initials = (user?.name || user?.mobile || 'S')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className='bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen transition-colors pb-28 selection:bg-emerald-500 selection:text-white'>

      {/* ── STICKY TOP APP HEADER ── */}
      <div className='sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between shadow-xs'>
        <button
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1)
            } else {
              navigate('/')
            }
          }}
          className='w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-90 transition-transform'
          aria-label='Back'
        >
          <IoArrowBack size={18} />
        </button>
        <h1 className='text-base font-extrabold text-slate-900 dark:text-white tracking-tight'>Profile</h1>
        <a
          href="https://wa.me/919472026580?text=Hi%20Snapit%20Support,%20I%20need%20help%20with%20my%20account"
          target="_blank"
          rel="noopener noreferrer"
          className='w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center active:scale-90 transition-transform border border-emerald-200/50 dark:border-emerald-800/50'
          aria-label='Help'
        >
          <FaWhatsapp size={18} />
        </a>
      </div>

      <div className='max-w-xl mx-auto px-4 pt-4 space-y-4'>

        {/* ── USER IDENTITY HERO CARD ── */}
        <div className='bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800/70 shadow-xs flex items-center justify-between gap-3'>
          <div className='flex items-center gap-3.5 min-w-0'>
            <div className='w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-500/20 shrink-0'>
              {initials}
            </div>
            <div className='min-w-0'>
              <div className='flex items-center gap-2 flex-wrap'>
                <h2 className='font-black text-slate-900 dark:text-white text-lg leading-tight truncate max-w-[200px]'>
                  {user?.name || user?.mobile || 'Snapit Customer'}
                </h2>
                {role === 'ADMIN' && (
                  <span className='text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'>
                    Admin
                  </span>
                )}
                {role === 'SUPER_ADMIN' && (
                  <span className='text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700'>
                    Super Admin
                  </span>
                )}
                {role === 'RIDER' && (
                  <span className='text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700'>
                    Fleet Rider
                  </span>
                )}
                {role === 'SELLER' && (
                  <span className='text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700'>
                    Store Partner
                  </span>
                )}
                {role === 'RESTO_SELLER' && (
                  <span className='text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700'>
                    Restaurant
                  </span>
                )}
              </div>
              <p className='text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium truncate'>
                {user?.mobile ? `+91 ${String(user.mobile).slice(-10)}` : user?.email || 'Welcome to Snapit'}
              </p>
            </div>
          </div>

          <Link
            to='/dashboard/profile'
            className='shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition'
            title='View Profile'
          >
            <FiUser size={15} />
          </Link>
        </div>

        {/* ── TRIO QUICK METRIC CARDS (Blinkit Style, Superior Polish) ── */}
        <div className='grid grid-cols-3 gap-2.5'>
          {/* Card 1: Snapit Wallet */}
          <Link
            to='/wallet'
            className='bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/70 rounded-2xl p-3 flex flex-col justify-between hover:border-emerald-500/40 transition-all active:scale-[0.98] shadow-2xs group'
          >
            <div className='w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform'>
              <FiCreditCard size={16} />
            </div>
            <div>
              <p className='text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-none'>Snapit Wallet</p>
              <p className='text-sm font-black text-slate-900 dark:text-white mt-1'>
                {DisplayPriceInRupees(user?.walletBalance || 0)}
              </p>
            </div>
          </Link>

          {/* Card 2: 24/7 Support */}
          <a
            href="https://wa.me/919472026580?text=Hi%20Snapit,%20I%20need%20assistance"
            target="_blank"
            rel="noopener noreferrer"
            className='bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/70 rounded-2xl p-3 flex flex-col justify-between hover:border-blue-500/40 transition-all active:scale-[0.98] shadow-2xs group'
          >
            <div className='w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform'>
              <FiHelpCircle size={16} />
            </div>
            <div>
              <p className='text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-none'>24/7 Support</p>
              <p className='text-sm font-black text-blue-600 dark:text-blue-400 mt-1'>Get Help</p>
            </div>
          </a>

          {/* Card 3: Orders */}
          <Link
            to='/dashboard/myorders'
            className='bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/70 rounded-2xl p-3 flex flex-col justify-between hover:border-amber-500/40 transition-all active:scale-[0.98] shadow-2xs group'
          >
            <div className='w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform'>
              <FiShoppingBag size={16} />
            </div>
            <div>
              <p className='text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-none'>My Orders</p>
              <p className='text-sm font-black text-slate-900 dark:text-white mt-1'>History →</p>
            </div>
          </Link>
        </div>

        {/* ── APP STATUS & APPEARANCE STRIP ── */}
        <div className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 divide-y divide-slate-100 dark:divide-slate-800/80 shadow-xs overflow-hidden'>
          {/* App Update Row (Blinkit style dynamic state) */}
          <div
            onClick={handleUpdateClick}
            className={`flex items-center justify-between p-3 cursor-pointer transition-colors select-none ${
              versionInfo.hasUpdate
                ? 'bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100/80 dark:hover:bg-amber-900/50'
                : 'hover:bg-slate-50 dark:hover:bg-slate-850'
            }`}
          >
            <div className='flex items-center gap-3'>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                versionInfo.hasUpdate
                  ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
              }`}>
                {versionInfo.hasUpdate ? (
                  <FiRefreshCw className='animate-spin' style={{ animationDuration: '4s' }} size={16} />
                ) : (
                  <FiCheck size={16} />
                )}
              </div>
              <div>
                <p className={`text-xs font-bold leading-none ${
                  versionInfo.hasUpdate
                    ? 'text-amber-900 dark:text-amber-200'
                    : 'text-slate-900 dark:text-white'
                }`}>
                  {versionInfo.hasUpdate ? 'App Update Available' : 'App is Up to Date'}
                </p>
                <p className='text-[10px] text-slate-400 mt-0.5 font-medium'>
                  {versionInfo.hasUpdate ? 'Tap to update from Play Store' : 'Snapit Latest Release'}
                </p>
              </div>
            </div>

            {versionInfo.hasUpdate ? (
              <div className='flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950 px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs active:scale-95 transition-all'>
                <span>v{versionInfo.latestVersion}</span>
                <FiChevronRight size={13} />
              </div>
            ) : (
              <div className='flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 text-xs font-mono font-bold'>
                <span>v{CURRENT_APP_VERSION}</span>
                {copiedVersion ? <FiCheck className='text-emerald-500' size={12} /> : <FiCopy size={12} />}
              </div>
            )}
          </div>

          {/* Theme Row */}
          <div className='p-2'>
            <ThemeToggle variant="row" />
          </div>
        </div>

        {/* ── ROLE-AWARE PARTNER WIDGET ── */}
        {/* Customer view: Deliver with Snapit promotion */}
        {(!role || role === "USER") && (
          <Link
            to='/rider/join'
            className='block bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 border border-emerald-500/40 rounded-2xl p-3.5 text-white shadow-md shadow-emerald-900/10 active:scale-[0.99] transition-transform'
          >
            <div className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 text-xl shrink-0'>
                  <FiTruck size={20} />
                </div>
                <div>
                  <div className='flex items-center gap-2'>
                    <h3 className='font-black text-sm text-white'>Deliver with Snapit</h3>
                    <span className='text-[9px] bg-emerald-400 text-slate-950 font-black px-1.5 py-0.5 rounded-full uppercase'>
                      Earn Daily
                    </span>
                  </div>
                  <p className='text-[11px] text-emerald-200/80 font-medium mt-0.5'>
                    Earn ₹7,000 – ₹15,000/mo in Paliganj. Instant onboarding.
                  </p>
                </div>
              </div>
              <FiChevronRight className='text-emerald-300 shrink-0' size={18} />
            </div>
          </Link>
        )}

        {/* Rider view: Quick duty toggle / dashboard */}
        {(role === "RIDER" || role === "ADMIN" || role === "SUPER_ADMIN") && (
          <Link
            to='/rider-panel'
            className='block bg-gradient-to-r from-blue-900 via-slate-900 to-blue-950 border border-blue-500/40 rounded-2xl p-3.5 text-white shadow-md active:scale-[0.99] transition-transform'
          >
            <div className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 text-xl shrink-0'>
                  <FiTruck size={20} />
                </div>
                <div>
                  <div className='flex items-center gap-2'>
                    <h3 className='font-black text-sm text-white'>Rider Duty & Orders Panel</h3>
                    <span className='text-[9px] bg-blue-400 text-slate-950 font-black px-1.5 py-0.5 rounded-full uppercase'>
                      Active
                    </span>
                  </div>
                  <p className='text-[11px] text-blue-200/80 font-medium mt-0.5'>
                    Manage delivery shift, accept orders & track cash remittance
                  </p>
                </div>
              </div>
              <FiChevronRight className='text-blue-300 shrink-0' size={18} />
            </div>
          </Link>
        )}

        {/* Seller view: Store order packing */}
        {role === "SELLER" && (
          <Link
            to='/dashboard/seller-dashboard'
            className='block bg-gradient-to-r from-orange-950 via-slate-900 to-orange-900 border border-orange-500/40 rounded-2xl p-3.5 text-white shadow-md active:scale-[0.99] transition-transform'
          >
            <div className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-400/30 flex items-center justify-center text-orange-300 text-xl shrink-0'>
                  <FiPackage size={20} />
                </div>
                <div>
                  <h3 className='font-black text-sm text-white'>Store Orders & Packing</h3>
                  <p className='text-[11px] text-orange-200/80 font-medium mt-0.5'>
                    Pack live items & print invoices
                  </p>
                </div>
              </div>
              <FiChevronRight className='text-orange-300 shrink-0' size={18} />
            </div>
          </Link>
        )}

        {/* Resto Seller view: Resto dashboard */}
        {role === "RESTO_SELLER" && (
          <Link
            to='/dashboard/resto-dashboard'
            className='block bg-gradient-to-r from-red-950 via-slate-900 to-red-900 border border-red-500/40 rounded-2xl p-3.5 text-white shadow-md active:scale-[0.99] transition-transform'
          >
            <div className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-xl bg-red-500/20 border border-red-400/30 flex items-center justify-center text-red-300 text-xl shrink-0'>
                  <FiHome size={20} />
                </div>
                <div>
                  <h3 className='font-black text-sm text-white'>Restaurant Kitchen Dashboard</h3>
                  <p className='text-[11px] text-red-200/80 font-medium mt-0.5'>
                    Manage food orders, live status & menu availability
                  </p>
                </div>
              </div>
              <FiChevronRight className='text-red-300 shrink-0' size={18} />
            </div>
          </Link>
        )}

        {/* ── SECTION 1: YOUR INFORMATION ── */}
        <div className='space-y-2'>
          <p className='text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1'>
            Your Information
          </p>
          <div className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 divide-y divide-slate-100 dark:divide-slate-800/80 shadow-xs overflow-hidden'>
            <Link
              to='/dashboard/myorders'
              className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
            >
              <div className='flex items-center gap-3'>
                <div className='w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0'>
                  <FiShoppingBag size={16} />
                </div>
                <span className='font-semibold text-sm text-slate-800 dark:text-slate-200'>Your Orders</span>
              </div>
              <FiChevronRight className='text-slate-400' size={16} />
            </Link>

            <Link
              to='/wishlist'
              className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
            >
              <div className='flex items-center gap-3'>
                <div className='w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0'>
                  <FiHeart size={16} />
                </div>
                <span className='font-semibold text-sm text-slate-800 dark:text-slate-200'>Your Wishlist</span>
              </div>
              <FiChevronRight className='text-slate-400' size={16} />
            </Link>

            <Link
              to='/subscriptions'
              className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
            >
              <div className='flex items-center gap-3'>
                <div className='w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0'>
                  <FiRepeat size={16} />
                </div>
                <span className='font-semibold text-sm text-slate-800 dark:text-slate-200'>My Subscriptions</span>
              </div>
              <FiChevronRight className='text-slate-400' size={16} />
            </Link>

            <Link
              to='/pharmacy'
              className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
            >
              <div className='flex items-center gap-3'>
                <div className='w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0'>
                  <FiFileText size={16} />
                </div>
                <span className='font-semibold text-sm text-slate-800 dark:text-slate-200'>Prescriptions & Pharmacy</span>
              </div>
              <FiChevronRight className='text-slate-400' size={16} />
            </Link>

            <Link
              to='/dashboard/address'
              className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
            >
              <div className='flex items-center gap-3'>
                <div className='w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0'>
                  <FiMapPin size={16} />
                </div>
                <span className='font-semibold text-sm text-slate-800 dark:text-slate-200'>Address Book</span>
              </div>
              <FiChevronRight className='text-slate-400' size={16} />
            </Link>
          </div>
        </div>

        {/* ── SECTION 2: REWARDS & OFFERS ── */}
        <div className='space-y-2'>
          <p className='text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1'>
            Rewards &amp; Perks
          </p>
          <div className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 divide-y divide-slate-100 dark:divide-slate-800/80 shadow-xs overflow-hidden'>
            <Link
              to='/snapit-plus'
              className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
            >
              <div className='flex items-center gap-3'>
                <div className='w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0'>
                  <FiAward size={16} />
                </div>
                <div className='flex items-center gap-2'>
                  <span className='font-semibold text-sm text-slate-800 dark:text-slate-200'>Snapit Plus Membership</span>
                  <span className='text-[10px] font-black bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded-full'>
                    VIP
                  </span>
                </div>
              </div>
              <FiChevronRight className='text-slate-400' size={16} />
            </Link>

            <Link
              to='/streak'
              className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
            >
              <div className='flex items-center gap-3'>
                <div className='w-9 h-9 rounded-full bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 relative'>
                  <FiZap size={16} />
                  <span className='absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900' />
                </div>
                <span className='font-semibold text-sm text-slate-800 dark:text-slate-200'>Daily Streak &amp; Rewards</span>
              </div>
              <FiChevronRight className='text-slate-400' size={16} />
            </Link>

            <Link
              to='/refer'
              className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
            >
              <div className='flex items-center gap-3'>
                <div className='w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0'>
                  <FiGift size={16} />
                </div>
                <div className='flex items-center gap-2'>
                  <span className='font-semibold text-sm text-slate-800 dark:text-slate-200'>Refer &amp; Earn</span>
                  <span className='text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 px-1.5 py-0.5 rounded-full'>
                    10 Coins
                  </span>
                </div>
              </div>
              <FiChevronRight className='text-slate-400' size={16} />
            </Link>

            <Link
              to='/deals'
              className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
            >
              <div className='flex items-center gap-3'>
                <div className='w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0'>
                  <FiPercent size={16} />
                </div>
                <span className='font-semibold text-sm text-slate-800 dark:text-slate-200'>All Deals &amp; Offers</span>
              </div>
              <FiChevronRight className='text-slate-400' size={16} />
            </Link>
          </div>
        </div>

        {/* ── SECTION 3: ADMIN & STORE MANAGEMENT (Role-gated) ── */}
        {(role === "ADMIN" || role === "SUPER_ADMIN") && (
          <div className='space-y-2'>
            <p className='text-[11px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 px-1'>
              Admin &amp; Operations
            </p>
            <div className='bg-white dark:bg-slate-900 rounded-2xl border border-purple-200/60 dark:border-purple-900/40 divide-y divide-slate-100 dark:divide-slate-800/80 shadow-xs overflow-hidden'>
              <Link
                to='/dashboard/store-orders'
                className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
              >
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0'>
                    <FiPackage size={16} />
                  </div>
                  <span className='font-bold text-sm text-emerald-800 dark:text-emerald-300'>Store Packing &amp; Live Orders</span>
                </div>
                <FiChevronRight className='text-slate-400' size={16} />
              </Link>

              <Link
                to='/dashboard/rider-fleet'
                className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
              >
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0'>
                    <FiTruck size={16} />
                  </div>
                  <span className='font-bold text-sm text-blue-700 dark:text-blue-300'>Live Rider Fleet Tracker</span>
                </div>
                <FiChevronRight className='text-slate-400' size={16} />
              </Link>

              <Link
                to='/dashboard/rider-fleet?tab=applications'
                className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
              >
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0'>
                    <FiUser size={16} />
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='font-bold text-sm text-teal-800 dark:text-teal-300'>Rider Applications</span>
                    <span className='text-[10px] bg-teal-200 dark:bg-teal-800 text-teal-950 dark:text-teal-100 px-1.5 py-0.5 rounded-full font-black'>
                      Review
                    </span>
                  </div>
                </div>
                <FiChevronRight className='text-slate-400' size={16} />
              </Link>

              <Link
                to='/dashboard/marketing'
                className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
              >
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0'>
                    <FiTrendingUp size={16} />
                  </div>
                  <span className='font-bold text-sm text-amber-800 dark:text-amber-300'>Marketing &amp; Notification Hub</span>
                </div>
                <FiChevronRight className='text-slate-400' size={16} />
              </Link>

              <Link
                to='/dashboard/treasury'
                className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
              >
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0'>
                    <FiDollarSign size={16} />
                  </div>
                  <span className='font-bold text-sm text-emerald-800 dark:text-emerald-300'>COD Treasury &amp; Split</span>
                </div>
                <FiChevronRight className='text-slate-400' size={16} />
              </Link>

              <Link
                to='/dashboard/admin-summary'
                className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
              >
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0'>
                    <FiGrid size={16} />
                  </div>
                  <span className='font-bold text-sm text-slate-800 dark:text-slate-200'>Admin Summary Dashboard</span>
                </div>
                <FiChevronRight className='text-slate-400' size={16} />
              </Link>

              <Link
                to='/dashboard/reset-pin'
                className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
              >
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0'>
                    <FiRefreshCw size={16} />
                  </div>
                  <span className='font-bold text-sm text-rose-700 dark:text-rose-300'>Reset Customer PIN</span>
                </div>
                <FiChevronRight className='text-slate-400' size={16} />
              </Link>

              <Link
                to='/dashboard/category'
                className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
              >
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0'>
                    <FiLayers size={16} />
                  </div>
                  <span className='font-medium text-sm text-slate-800 dark:text-slate-200'>Category Management</span>
                </div>
                <FiChevronRight className='text-slate-400' size={16} />
              </Link>

              <Link
                to='/dashboard/subcategory'
                className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
              >
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0'>
                    <FiLayers size={16} />
                  </div>
                  <span className='font-medium text-sm text-slate-800 dark:text-slate-200'>Sub Category Management</span>
                </div>
                <FiChevronRight className='text-slate-400' size={16} />
              </Link>

              <Link
                to='/dashboard/upload-product'
                className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
              >
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0'>
                    <FiUpload size={16} />
                  </div>
                  <span className='font-medium text-sm text-slate-800 dark:text-slate-200'>Upload Product</span>
                </div>
                <FiChevronRight className='text-slate-400' size={16} />
              </Link>

              <Link
                to='/dashboard/product'
                className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
              >
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0'>
                    <FiPackage size={16} />
                  </div>
                  <span className='font-medium text-sm text-slate-800 dark:text-slate-200'>Product Inventory</span>
                </div>
                <FiChevronRight className='text-slate-400' size={16} />
              </Link>

              <Link
                to='/dashboard/refunds'
                className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
              >
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0'>
                    <FiCreditCard size={16} />
                  </div>
                  <span className='font-medium text-sm text-slate-800 dark:text-slate-200'>Refunds &amp; Disputes</span>
                </div>
                <FiChevronRight className='text-slate-400' size={16} />
              </Link>

              <Link
                to='/dashboard/restaurant-admin'
                className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
              >
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 flex items-center justify-center shrink-0'>
                    <FiHome size={16} />
                  </div>
                  <span className='font-bold text-sm text-orange-700 dark:text-orange-300'>Resto Management</span>
                </div>
                <FiChevronRight className='text-slate-400' size={16} />
              </Link>

              <Link
                to='/dashboard/store-sellers'
                className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
              >
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0'>
                    <FiTrendingUp size={16} />
                  </div>
                  <span className='font-medium text-sm text-slate-800 dark:text-slate-200'>Store Rankings</span>
                </div>
                <FiChevronRight className='text-slate-400' size={16} />
              </Link>

              <Link
                to='/dashboard/campus-ambassadors'
                className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
              >
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0'>
                    <FiAward size={16} />
                  </div>
                  <span className='font-medium text-sm text-slate-800 dark:text-slate-200'>Campus Ambassadors</span>
                </div>
                <FiChevronRight className='text-slate-400' size={16} />
              </Link>

              <Link
                to='/dashboard/store-earnings'
                className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
              >
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0'>
                    <FiDollarSign size={16} />
                  </div>
                  <span className='font-medium text-sm text-slate-800 dark:text-slate-200'>Store Earnings</span>
                </div>
                <FiChevronRight className='text-slate-400' size={16} />
              </Link>

              {role === "SUPER_ADMIN" && (
                <Link
                  to='/dashboard/super-admin'
                  className='flex items-center justify-between p-3 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors'
                >
                  <div className='flex items-center gap-3'>
                    <div className='w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0'>
                      <FiShield size={16} />
                    </div>
                    <span className='font-black text-sm text-purple-700 dark:text-purple-300'>Super Admin Panel</span>
                  </div>
                  <FiChevronRight className='text-slate-400' size={16} />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── SECTION 4: OTHER INFORMATION ── */}
        <div className='space-y-2'>
          <p className='text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1'>
            Other Information
          </p>
          <div className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 divide-y divide-slate-100 dark:divide-slate-800/80 shadow-xs overflow-hidden'>
            <button
              type='button'
              onClick={handleShareApp}
              className='w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors text-left'
            >
              <div className='flex items-center gap-3'>
                <div className='w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0'>
                  <FiShare2 size={16} />
                </div>
                <span className='font-semibold text-sm text-slate-800 dark:text-slate-200'>Share the App</span>
              </div>
              <FiChevronRight className='text-slate-400' size={16} />
            </button>

            <button
              type='button'
              onClick={() => window.dispatchEvent(new CustomEvent('open-smart-rating'))}
              className='w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors text-left'
            >
              <div className='flex items-center gap-3'>
                <div className='w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0'>
                  <FiStar size={16} />
                </div>
                <div className='flex items-center gap-2'>
                  <span className='font-semibold text-sm text-slate-800 dark:text-slate-200'>Rate Us on Play Store</span>
                  <span className='text-[10px] font-black bg-amber-200 dark:bg-amber-800 text-amber-950 dark:text-amber-100 px-1.5 py-0.5 rounded-full'>
                    5★ Review
                  </span>
                </div>
              </div>
              <FiChevronRight className='text-slate-400' size={16} />
            </button>

            <Link
              to='/privacy-policy'
              className='flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors'
            >
              <div className='flex items-center gap-3'>
                <div className='w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0'>
                  <FiShield size={16} />
                </div>
                <span className='font-semibold text-sm text-slate-800 dark:text-slate-200'>Account Privacy &amp; Terms</span>
              </div>
              <FiChevronRight className='text-slate-400' size={16} />
            </Link>

            <button
              type='button'
              onClick={handleLogout}
              className='w-full flex items-center justify-between p-3 hover:bg-rose-50/70 dark:hover:bg-rose-950/30 transition-colors text-left text-rose-600 dark:text-rose-400'
            >
              <div className='flex items-center gap-3'>
                <div className='w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0'>
                  <FiLogOut size={16} />
                </div>
                <span className='font-bold text-sm'>Log Out</span>
              </div>
              <FiChevronRight className='text-rose-400' size={16} />
            </button>
          </div>
        </div>

        {/* ── FOOTER BRANDING (Blinkit Style) ── */}
        <div className='pt-6 pb-2 text-center space-y-1.5 select-none'>
          <h4 className='text-lg font-black tracking-tight text-slate-400 dark:text-slate-600 uppercase'>
            Snapit
          </h4>
          <button
            type='button'
            onClick={handleCopyVersion}
            className='inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium hover:text-slate-600 dark:hover:text-slate-300 transition-colors'
          >
            <span>{APP_VERSION} (102)</span>
            <FiCopy size={11} />
          </button>
          <p className='text-[11px] text-slate-400/80 dark:text-slate-600 font-medium'>
            Made with ❤️ for Paliganj, Bihar
          </p>
        </div>

      </div>
    </div>
  )
}

export default UserMenuMobile
