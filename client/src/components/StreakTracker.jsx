import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { setUserDetails } from '../store/userSlice'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import { haptic } from '../utils/haptics'
import {
  IoArrowBack,
  IoFlame,
  IoGiftOutline,
  IoCheckmarkCircle,
  IoSparkles,
  IoInformationCircleOutline,
  IoTimeOutline
} from 'react-icons/io5'
import { FaCrown, FaCoins, FaWallet } from 'react-icons/fa'
import { FiShoppingBag, FiArrowRight, FiCheck, FiLock } from 'react-icons/fi'

const MILESTONES = [
  { days: 3,  coins: 20,  icon: '🌱', label: 'Sprout',   desc: 'First spark of consistency' },
  { days: 7,  coins: 50,  icon: '🔥', label: 'On Fire',  desc: '1 Full week of daily shopping' },
  { days: 14, coins: 120, icon: '⚡', label: 'Electric', desc: 'Two weeks non-stop momentum' },
  { days: 30, coins: 300, icon: '👑', label: 'Legend',   desc: 'A full month of VIP loyalty' },
]

export default function StreakTracker({ isCardOnly = false }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state) => state.user)

  const [streak, setStreak] = useState(0)
  const [claimedRewards, setClaimedRewards] = useState([])
  const [orderedToday, setOrderedToday] = useState(false)
  const [streakAlive, setStreakAlive] = useState(false)
  const [checkedInToday, setCheckedInToday] = useState(false)
  const [checkinCoins, setCheckinCoins] = useState(5)
  const [coins, setCoins] = useState(Number(user?.coins || 0))
  const [walletBalance, setWalletBalance] = useState(Number(user?.walletBalance || 0))
  const [loading, setLoading] = useState(true)
  const [claimingMilestone, setClaimingMilestone] = useState(null)
  const [checkingIn, setCheckingIn] = useState(false)

  // Fetch streak & rewards telemetry
  const fetchStreakData = async () => {
    try {
      const res = await Axios({
        url: SummaryApi.getStreakMe?.url || '/api/streak/me',
        method: SummaryApi.getStreakMe?.method || 'get'
      })
      if (res.data?.success) {
        const d = res.data.data
        setStreak(d.currentStreak || 0)
        setClaimedRewards(d.claimedMilestones || [])
        setOrderedToday(Boolean(d.orderedToday))
        setStreakAlive(Boolean(d.streakAlive))
        setCheckedInToday(Boolean(d.checkedInToday))
        setCheckinCoins(d.checkinRewardCoins || 5)
        setCoins(Number(d.coins || 0))
        if (typeof d.walletBalance === 'number') {
          setWalletBalance(d.walletBalance)
        }
      }
    } catch (err) {
      console.error('Failed to load streak telemetry:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStreakData()
  }, [])

  // Sync Redux state changes
  useEffect(() => {
    if (typeof user?.walletBalance === 'number') {
      setWalletBalance(user.walletBalance)
    }
    if (typeof user?.coins === 'number') {
      setCoins(user.coins)
    }
  }, [user?.walletBalance, user?.coins])

  // Milestone telemetry
  const nextMilestone = useMemo(() => {
    return MILESTONES.find(m => m.days > streak) || null
  }, [streak])

  const claimableMilestones = useMemo(() => {
    const activeStreak = streakAlive ? streak : 0
    return MILESTONES.filter(m => m.days <= activeStreak && !claimedRewards.includes(m.days))
  }, [streak, streakAlive, claimedRewards])

  const progressPct = useMemo(() => {
    if (!nextMilestone) return 100
    const prevDays = MILESTONES.filter(m => m.days < nextMilestone.days).pop()?.days || 0
    const span = nextMilestone.days - prevDays
    const progress = Math.max(0, streak - prevDays)
    return Math.min(100, Math.max(5, Math.round((progress / span) * 100)))
  }, [streak, nextMilestone])

  // Generate real 7-day calendar strip leading up to Today
  const pastSevenDays = useMemo(() => {
    const list = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const dayName = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })
      const dateNum = d.getDate()
      const isPastStreakDay = i > 0 && i <= streak
      const isTodayCompleted = i === 0 && orderedToday
      const isCompleted = isPastStreakDay || isTodayCompleted

      list.push({
        dayName,
        dateNum,
        isToday: i === 0,
        isCompleted
      })
    }
    return list
  }, [streak, orderedToday])

  // Handle 1-Tap Daily Check-in (Zero wallet loss: awards Snapit Coins only)
  const handleCheckin = async () => {
    if (checkedInToday || checkingIn) return
    try { haptic.selection() } catch {}
    setCheckingIn(true)
    try {
      const res = await Axios({
        url: SummaryApi.dailyCheckin?.url || '/api/streak/checkin',
        method: SummaryApi.dailyCheckin?.method || 'post'
      })

      if (res.data?.success) {
        try { haptic.success() } catch {}
        setCheckedInToday(true)
        const updatedCoins = res.data?.data?.coins ?? (coins + checkinCoins)
        setCoins(updatedCoins)
        toast.success(`🎉 +${checkinCoins} Snapit Coins collected! Keep your streak going 🔥`)

        // Sync Redux state
        try {
          const userRes = await Axios({ url: '/api/user/user-details', method: 'get' })
          if (userRes.data?.success) dispatch(setUserDetails(userRes.data.data))
        } catch (_) {}
      } else {
        toast.error(res.data?.message || 'Check-in failed')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in already claimed or network error')
    } finally {
      setCheckingIn(false)
    }
  }

  // Handle Milestone Reward Claim (Zero wallet loss: awards Snapit Coins only)
  const handleClaimMilestone = async (days) => {
    if (claimingMilestone) return
    try { haptic.selection() } catch {}
    setClaimingMilestone(days)
    try {
      const res = await Axios({
        url: SummaryApi.claimStreakMilestone?.url || '/api/streak/claim',
        method: SummaryApi.claimStreakMilestone?.method || 'post',
        data: { milestone: days }
      })

      if (res.data?.success) {
        try { haptic.success() } catch {}
        setClaimedRewards(prev => [...prev, days])
        const target = MILESTONES.find(m => m.days === days)
        const rewardCoins = target?.coins || 0
        const updatedCoins = res.data?.data?.coins ?? (coins + rewardCoins)
        setCoins(updatedCoins)
        toast.success(`🎉 Milestone unlocked! +${rewardCoins} Snapit Coins collected!`)

        // Sync Redux
        try {
          const userRes = await Axios({ url: '/api/user/user-details', method: 'get' })
          if (userRes.data?.success) dispatch(setUserDetails(userRes.data.data))
        } catch (_) {}
      } else {
        toast.error(res.data?.message || 'Failed to claim milestone reward')
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to claim reward')
    } finally {
      setClaimingMilestone(null)
    }
  }

  // Embeddable Card content
  const cardBody = (
    <div className='space-y-4'>
      {/* ── HERO STREAK BANNER ── */}
      <div className='relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 p-5 sm:p-6 text-white shadow-xl shadow-orange-500/20'>
        {/* Decorative blur orbs */}
        <div className='absolute -right-8 -bottom-8 w-36 h-36 bg-yellow-300/20 rounded-full blur-2xl pointer-events-none' />
        <div className='absolute -left-6 -top-6 w-28 h-28 bg-rose-400/20 rounded-full blur-xl pointer-events-none' />

        <div className='relative z-10'>
          {/* Top Pill Row: Explicit distinction between Loyalty Coins and Real Money Wallet */}
          <div className='flex items-center justify-between gap-2 flex-wrap mb-3'>
            <span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-black uppercase tracking-wider text-white border border-white/20 shadow-xs'>
              <IoFlame className='text-amber-200 animate-pulse text-sm' />
              <span>Daily Order Streak</span>
            </span>

            <div className='flex items-center gap-2'>
              {/* Snapit Loyalty Coins */}
              <div
                className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 backdrop-blur-md text-xs font-black text-amber-200 border border-white/15 shadow-xs'
                title='Snapit Loyalty Coins'
              >
                <FaCoins size={12} className='text-amber-300' />
                <span>{coins.toLocaleString('en-IN')} Coins</span>
              </div>

              {/* Real Money Wallet Link */}
              <Link
                to='/wallet'
                className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 hover:bg-black/35 backdrop-blur-md text-xs font-bold text-white/90 border border-white/15 transition-colors'
                title='Real Money Wallet Balance'
              >
                <FaWallet size={11} className='text-emerald-300' />
                <span>₹{walletBalance}</span>
              </Link>
            </div>
          </div>

          {/* Main Streak Counter */}
          <div className='flex items-end justify-between gap-4 my-2'>
            <div>
              <div className='flex items-baseline gap-2'>
                <span className='text-5xl sm:text-6xl font-black tracking-tight leading-none text-white drop-shadow-sm'>
                  {streak}
                </span>
                <span className='text-lg sm:text-xl font-black text-white/90'>
                  {streak === 1 ? 'Day' : 'Days'}
                </span>
              </div>

              {/* Status Message */}
              <div className='mt-2'>
                {orderedToday ? (
                  <span className='inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-emerald-100 bg-emerald-950/40 px-2.5 py-0.5 rounded-lg border border-emerald-400/30'>
                    <IoCheckmarkCircle className='text-emerald-400 shrink-0' />
                    <span>Streak safe! You ordered today.</span>
                  </span>
                ) : streakAlive ? (
                  <span className='inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-amber-100 bg-amber-950/40 px-2.5 py-0.5 rounded-lg border border-amber-400/30 animate-pulse'>
                    <IoTimeOutline className='text-amber-300 shrink-0' />
                    <span>Order before 11:59 PM to save your streak!</span>
                  </span>
                ) : (
                  <span className='inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-white/90 bg-white/15 px-2.5 py-0.5 rounded-lg'>
                    <span>Place an order today to ignite your streak!</span>
                  </span>
                )}
              </div>
            </div>

            {/* Giant Flame Avatar */}
            <div className='shrink-0 flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-inner'>
              <span className='text-4xl sm:text-5xl transform transition-transform hover:scale-110'>
                {streakAlive ? '🔥' : '💤'}
              </span>
            </div>
          </div>

          {/* Progress bar to next milestone */}
          {nextMilestone ? (
            <div className='mt-5 pt-4 border-t border-white/20'>
              <div className='flex justify-between items-center text-[11px] font-bold text-white/90 mb-1.5'>
                <span>Next Milestone: {nextMilestone.icon} {nextMilestone.days} Days ({nextMilestone.label})</span>
                <span className='text-amber-200 font-black'>+{nextMilestone.coins} Snapit Coins</span>
              </div>

              <div className='w-full h-2.5 bg-black/20 rounded-full p-0.5 overflow-hidden backdrop-blur-xs'>
                <div
                  className='h-full bg-gradient-to-r from-amber-300 to-yellow-200 rounded-full transition-all duration-700 ease-out shadow-xs'
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className='flex justify-between items-center text-[10px] text-white/75 font-semibold mt-1.5'>
                <span>Current: {streak} days</span>
                <span>{nextMilestone.days - streak} more {nextMilestone.days - streak === 1 ? 'day' : 'days'} left</span>
              </div>
            </div>
          ) : (
            <div className='mt-4 pt-3 border-t border-white/20 text-center text-xs font-black text-amber-200 flex items-center justify-center gap-1'>
              <FaCrown />
              <span>Ultimate Legend! You have achieved all maximum streak milestones!</span>
            </div>
          )}

          {/* Action Button to Protect Streak if not ordered */}
          {!orderedToday && (
            <div className='mt-4'>
              <Link
                to='/grocery'
                onClick={() => { try { haptic.selection() } catch {} }}
                className='w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-orange-600 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-black/10 active:scale-95 transition-all'
              >
                <FiShoppingBag size={15} />
                <span>Shop Today &amp; Protect Streak</span>
                <FiArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── 7-DAY ACTIVITY CALENDAR ── */}
      <div className='bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs'>
        <div className='flex items-center justify-between mb-3.5'>
          <h3 className='font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5'>
            <span>📅 Past 7 Days Activity</span>
          </h3>
          <span className='text-[11px] font-bold text-slate-400'>
            {orderedToday ? 'Streak active' : streakAlive ? 'Order pending' : 'Inactive'}
          </span>
        </div>

        <div className='grid grid-cols-7 gap-1.5 sm:gap-2'>
          {pastSevenDays.map((item, idx) => (
            <div
              key={idx}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                item.isCompleted
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60 shadow-xs'
                  : item.isToday
                  ? 'bg-slate-50 dark:bg-slate-800/80 border-orange-400 dark:border-orange-500 ring-2 ring-orange-400/20'
                  : 'bg-slate-50/60 dark:bg-slate-850/60 border-slate-100 dark:border-slate-800 text-slate-400'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                item.isToday
                  ? 'text-orange-600 dark:text-orange-400 font-black'
                  : item.isCompleted
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-slate-400 dark:text-slate-500'
              }`}>
                {item.dayName}
              </span>

              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                item.isCompleted
                  ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-sm shadow-orange-500/25'
                  : item.isToday
                  ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-300 dark:border-orange-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600'
              }`}>
                {item.isCompleted ? (
                  <FiCheck size={14} className='stroke-[3]' />
                ) : item.isToday ? (
                  <span className='w-2 h-2 rounded-full bg-orange-500 animate-ping' />
                ) : (
                  item.dateNum
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 1-TAP DAILY CHECK-IN REWARD ── */}
      <div className='bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-500/10 dark:from-emerald-950/40 dark:via-slate-900 dark:to-emerald-950/30 rounded-2xl p-4 sm:p-5 border border-emerald-300/80 dark:border-emerald-800/60 shadow-xs'>
        <div className='flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row'>
          <div className='flex items-center gap-3'>
            <div className='w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-2xl shrink-0 shadow-md shadow-emerald-500/20'>
              <IoGiftOutline />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <h4 className='font-black text-sm text-slate-900 dark:text-white leading-tight'>
                  Daily Free App Check-in
                </h4>
                <span className='px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'>
                  +{checkinCoins} Coins
                </span>
              </div>
              <p className='text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-snug'>
                {checkedInToday
                  ? '✓ Claimed today! Next free coins available tomorrow.'
                  : 'Tap to collect your 5 free Snapit Coins today.'}
              </p>
            </div>
          </div>

          <button
            type='button'
            disabled={checkedInToday || checkingIn}
            onClick={handleCheckin}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-xs shrink-0 flex items-center justify-center gap-1.5 transition-all shadow-sm ${
              checkedInToday
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 active:scale-95 cursor-pointer'
            }`}
          >
            {checkingIn ? (
              <span className='w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin' />
            ) : checkedInToday ? (
              <>
                <FiCheck size={14} className='text-emerald-500 stroke-[3]' />
                <span>Claimed Today</span>
              </>
            ) : (
              <>
                <IoSparkles size={14} />
                <span>Collect +{checkinCoins} Coins</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── UNCLAIMED MILESTONES (If any ready) ── */}
      {claimableMilestones.length > 0 && (
        <div className='bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs animate-in fade-in'>
          <div className='flex items-center justify-between'>
            <h3 className='font-black text-sm text-amber-950 dark:text-amber-200 flex items-center gap-1.5'>
              <IoSparkles className='text-amber-500' />
              <span>Milestone Rewards Ready to Collect!</span>
            </h3>
            <span className='text-[10px] font-black uppercase text-amber-800 dark:text-amber-300 bg-amber-200 dark:bg-amber-900/60 px-2 py-0.5 rounded-md'>
              {claimableMilestones.length} Available
            </span>
          </div>

          <div className='space-y-2'>
            {claimableMilestones.map(m => (
              <div
                key={m.days}
                className='flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 shadow-xs'
              >
                <div className='flex items-center gap-3'>
                  <span className='text-2xl'>{m.icon}</span>
                  <div>
                    <h4 className='font-black text-xs sm:text-sm text-slate-900 dark:text-white'>
                      {m.days}-Day Streak Milestone · {m.label}
                    </h4>
                    <p className='text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-0.5'>
                      +{m.coins} Free Snapit Coins
                    </p>
                  </div>
                </div>

                <button
                  type='button'
                  disabled={claimingMilestone === m.days}
                  onClick={() => handleClaimMilestone(m.days)}
                  className='px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all'
                >
                  {claimingMilestone === m.days ? (
                    <span className='w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                  ) : (
                    'Collect Reward'
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ALL MILESTONES SHOWCASE ── */}
      <div className='bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 space-y-3.5 shadow-xs'>
        <div className='flex items-center justify-between'>
          <h3 className='font-black text-sm text-slate-900 dark:text-white'>
            Streak Milestone Badges
          </h3>
          <span className='text-[10px] font-bold uppercase tracking-wider text-slate-400'>
            Progress &amp; Rewards
          </span>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          {MILESTONES.map(m => {
            const activeStreak = streakAlive ? streak : 0
            const isAchieved = activeStreak >= m.days
            const isClaimed = claimedRewards.includes(m.days)

            return (
              <div
                key={m.days}
                className={`relative rounded-2xl p-3.5 border transition-all ${
                  isClaimed
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                    : isAchieved
                    ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 shadow-xs'
                    : 'bg-slate-50/60 dark:bg-slate-850/60 border-slate-100 dark:border-slate-800 opacity-80'
                }`}
              >
                <div className='flex items-start justify-between gap-2'>
                  <div className='flex items-center gap-2.5'>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                      isClaimed
                        ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                        : isAchieved
                        ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                    }`}>
                      {m.icon}
                    </div>

                    <div>
                      <div className='flex items-center gap-1.5'>
                        <h4 className='font-black text-xs text-slate-900 dark:text-white leading-tight'>
                          {m.days} Days · {m.label}
                        </h4>
                      </div>
                      <p className='text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5'>
                        {m.desc}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                    isClaimed
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : isAchieved
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    +{m.coins} Coins
                  </span>
                </div>

                {/* Bottom status row */}
                <div className='mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-bold'>
                  {isClaimed ? (
                    <span className='inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400'>
                      <IoCheckmarkCircle size={13} />
                      <span>Reward Claimed</span>
                    </span>
                  ) : isAchieved ? (
                    <button
                      type='button'
                      disabled={claimingMilestone === m.days}
                      onClick={() => handleClaimMilestone(m.days)}
                      className='inline-flex items-center gap-1 text-xs font-black text-orange-600 dark:text-orange-400 hover:underline'
                    >
                      <span>🎁 Collect Now</span>
                      <FiArrowRight size={12} />
                    </button>
                  ) : (
                    <span className='inline-flex items-center gap-1 text-slate-400 dark:text-slate-500'>
                      <FiLock size={11} />
                      <span>{m.days - streak} days remaining</span>
                    </span>
                  )}

                  <span className='text-[10px] text-slate-400 font-medium'>
                    {Math.min(streak, m.days)} / {m.days} days
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── STREAK RULES & TRANSPARENCY ── */}
      <div className='bg-slate-100/70 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1.5'>
        <div className='flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300'>
          <IoInformationCircleOutline size={15} />
          <span>How Streaks &amp; Loyalty Rewards Work</span>
        </div>
        <ul className='space-y-1 list-disc list-inside text-[11px] leading-relaxed'>
          <li>Place at least 1 order each calendar day to maintain and increment your streak.</li>
          <li>Check in daily to collect free Snapit Loyalty Coins (+5 coins every day).</li>
          <li>Reach 3, 7, 14, and 30-day milestones to unlock exclusive streak badges and bonus coins!</li>
          <li>Streak counts reset if a full calendar day passes without any orders.</li>
        </ul>
      </div>
    </div>
  )

  // If used as embeddable component inside another page
  if (isCardOnly) {
    return cardBody
  }

  // Full Page View with Sticky Header and Back Navigation
  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-24'>
      {/* Sticky Top Header */}
      <div className='sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shadow-xs'>
        <div className='max-w-2xl mx-auto flex items-center justify-between'>
          <button
            onClick={() => {
              if (window.history.length > 1) navigate(-1)
              else navigate('/')
            }}
            className='w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-90 transition-transform'
            aria-label='Back'
          >
            <IoArrowBack size={18} />
          </button>

          <div className='text-center'>
            <h1 className='text-base font-black text-slate-900 dark:text-white leading-tight flex items-center gap-1.5 justify-center'>
              <IoFlame className='text-orange-500' />
              <span>Daily Streak &amp; Rewards</span>
            </h1>
            <p className='text-[10px] text-slate-400 font-bold uppercase tracking-wider'>
              Snapit Loyalty Club
            </p>
          </div>

          <div className='flex items-center gap-1.5'>
            <div
              className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-black shadow-xs'
              title='Snapit Loyalty Coins'
            >
              <FaCoins size={11} className='text-amber-500' />
              <span>{coins}</span>
            </div>

            <Link
              to='/wallet'
              className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-black shadow-xs active:scale-95 transition-all'
              title='Real Money Wallet'
            >
              <FaWallet size={11} className='text-emerald-500' />
              <span>₹{walletBalance}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className='max-w-2xl mx-auto px-4 pt-4 sm:pt-6'>
        {loading ? (
          <div className='space-y-4 pt-2'>
            <div className='h-48 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse' />
            <div className='h-32 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse' />
            <div className='h-40 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse' />
          </div>
        ) : (
          cardBody
        )}
      </div>
    </div>
  )
}