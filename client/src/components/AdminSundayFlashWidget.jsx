import React, { useState, useEffect, useRef, useMemo } from 'react'
import Axios from '../utils/Axios'
import toast from 'react-hot-toast'
import {
  FaFire,
  FaPlay,
  FaStop,
  FaClock,
  FaUsers,
  FaMotorcycle,
  FaCog,
  FaCheck,
  FaUndo,
  FaExclamationTriangle,
  FaShieldAlt,
  FaBroadcastTower,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
  FaSync,
  FaBolt,
  FaCheckCircle,
} from 'react-icons/fa'

const PRESET_TIMES = [
  { label: '5:00 PM', value: '17:00' },
  { label: '6:00 PM', value: '18:00' },
  { label: '7:00 PM', value: '19:00' },
  { label: '8:00 PM', value: '20:00' },
  { label: '9:00 PM', value: '21:00' },
]

const DURATION_PRESETS = [3, 5, 10, 15, 30]
const FOOD_CAP_PRESETS = [99, 129, 149, 199]

const AdminSundayFlashWidget = () => {
  // Server-synced state
  const [status, setStatus] = useState({
    isActive: false,
    remainingSeconds: 0,
    claimedCount: 0,
    endTime: null,
    startTime: null,
    scheduledTime: '17:00',
    formattedScheduleTime: '5:00 PM',
    durationMinutes: 5,
    maxFoodValue: 149,
    deliveryRules: {
      baseKm: 3,
      baseCharge: 29,
      perKmRate: 9,
      maxKm: 14,
    },
  })

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [savingSchedule, setSavingSchedule] = useState(false)

  // Drawer / Accordion for Settings
  const [showSettings, setShowSettings] = useState(false)

  // Modals for safe staff-level confirmations (no clunky window.confirm)
  const [showTriggerModal, setShowTriggerModal] = useState(false)
  const [showStopModal, setShowStopModal] = useState(false)

  // Form State for configuration
  const [scheduledTime, setScheduledTime] = useState('17:00')
  const [durationMinutes, setDurationMinutes] = useState(5)
  const [maxFoodValue, setMaxFoodValue] = useState(149)

  // Drift-proof countdown in seconds
  const [remainingSec, setRemainingSec] = useState(0)

  const isLive = Boolean(status.isActive || status.isLive)

  // Check if form has unsaved modifications
  const isDirty = useMemo(() => {
    return (
      scheduledTime !== (status.scheduledTime || '17:00') ||
      Number(durationMinutes) !== (status.durationMinutes || 5) ||
      Number(maxFoodValue) !== (status.maxFoodValue || 149)
    )
  }, [scheduledTime, durationMinutes, maxFoodValue, status])

  // Fetch engine status from backend
  const fetchStatus = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const res = await Axios({
        url: '/api/sunday-flash/status',
        method: 'get',
      })
      if (res.data?.success && res.data?.data) {
        const d = res.data.data
        setStatus(d)

        // Compute drift-free countdown from server endTime if active
        if (d.isActive && d.endTime) {
          const diffSec = Math.max(0, Math.floor((new Date(d.endTime).getTime() - Date.now()) / 1000))
          setRemainingSec(diffSec)
        } else {
          setRemainingSec(0)
        }

        // Synchronize local form inputs if not currently dirty
        if (!isDirty || isManual) {
          if (d.scheduledTime) setScheduledTime(d.scheduledTime)
          if (d.durationMinutes) setDurationMinutes(d.durationMinutes)
          if (d.maxFoodValue) setMaxFoodValue(d.maxFoodValue)
        }
      }
    } catch (err) {
      console.error('[AdminSundayFlashWidget] fetchStatus error:', err)
      if (isManual) toast.error('Could not refresh Flash Offer status.')
    } finally {
      setLoading(false)
      if (isManual) setRefreshing(false)
    }
  }

  // Initial load and smart polling interval
  useEffect(() => {
    fetchStatus()

    // Dynamic interval: 6s when live (for real-time order claims), 25s when idle
    const pollInterval = isLive ? 6000 : 25000
    const poller = setInterval(() => {
      // Don't poll when tab is backgrounded
      if (!document.hidden) {
        fetchStatus()
      }
    }, pollInterval)

    // Visibility API listener: refresh instantly when tab regains focus
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchStatus()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(poller)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isLive, isDirty])

  // High-precision, drift-proof ticking timer
  useEffect(() => {
    if (!isLive || !status.endTime) {
      setRemainingSec(0)
      return
    }

    const timer = setInterval(() => {
      const targetTime = new Date(status.endTime).getTime()
      const now = Date.now()
      const diff = Math.max(0, Math.floor((targetTime - now) / 1000))
      setRemainingSec(diff)

      if (diff <= 0) {
        clearInterval(timer)
        fetchStatus()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [isLive, status.endTime])

  // Calculate elapsed percentage for visual progress bar
  const totalDurationSec = (status.durationMinutes || durationMinutes || 5) * 60
  const progressPercent = useMemo(() => {
    if (!isLive || totalDurationSec <= 0) return 0
    const elapsed = totalDurationSec - remainingSec
    const pct = Math.min(100, Math.max(0, (elapsed / totalDurationSec) * 100))
    return Math.round(pct)
  }, [isLive, totalDurationSec, remainingSec])

  // Trigger Launch
  const handleTriggerLaunch = async () => {
    try {
      setActionLoading(true)
      const res = await Axios({
        url: '/api/sunday-flash/trigger',
        method: 'post',
        data: {
          durationMinutes: Number(durationMinutes),
          maxFoodValue: Number(maxFoodValue),
        },
      })
      if (res.data?.success) {
        toast.success(`🔥 Flash Offer is LIVE for ${durationMinutes} minutes! Push broadcast sent.`, {
          duration: 6000,
        })
        setShowTriggerModal(false)
        await fetchStatus(true)
      } else {
        toast.error(res.data?.message || 'Failed to trigger flash offer.')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to activate flash offer.')
    } finally {
      setActionLoading(false)
    }
  }

  // Emergency Stop
  const handleStopOffer = async () => {
    try {
      setActionLoading(true)
      const res = await Axios({
        url: '/api/sunday-flash/stop',
        method: 'post',
      })
      if (res.data?.success) {
        toast.success('🛑 Sunday Flash Offer successfully stopped.')
        setShowStopModal(false)
        await fetchStatus(true)
      } else {
        toast.error(res.data?.message || 'Failed to stop offer.')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to stop flash offer.')
    } finally {
      setActionLoading(false)
    }
  }

  // Save Schedule Config
  const handleSaveSchedule = async (e) => {
    if (e) e.preventDefault()
    try {
      setSavingSchedule(true)
      const res = await Axios({
        url: '/api/sunday-flash/update-schedule',
        method: 'post',
        data: {
          scheduledTime,
          durationMinutes: Number(durationMinutes),
          maxFoodValue: Number(maxFoodValue),
        },
      })
      if (res.data?.success) {
        toast.success(res.data.message || 'Schedule & rules updated successfully! 🎉')
        await fetchStatus(true)
      } else {
        toast.error(res.data?.message || 'Failed to update schedule.')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update schedule.')
    } finally {
      setSavingSchedule(false)
    }
  }

  // Reset unsaved changes to server state
  const handleResetForm = () => {
    if (status.scheduledTime) setScheduledTime(status.scheduledTime)
    if (status.durationMinutes) setDurationMinutes(status.durationMinutes)
    if (status.maxFoodValue) setMaxFoodValue(status.maxFoodValue)
    toast('Form reset to saved server values', { icon: '↩️' })
  }

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className='relative bg-gradient-to-br from-stone-950 via-neutral-950 to-stone-900 rounded-3xl p-5 sm:p-7 mb-6 text-white border border-amber-500/30 shadow-2xl overflow-hidden transition-all duration-300'>
      {/* Ambient background glow effects */}
      <div className='absolute -right-16 -top-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none' />
      <div className='absolute -left-16 -bottom-16 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl pointer-events-none' />

      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & MISSION CONTROL STATUS BAR
          ───────────────────────────────────────────────────────────── */}
      <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-amber-500/20 pb-5 mb-5 relative z-10'>
        {/* Left: Icon, Title & Live/Standby Pill */}
        <div className='flex items-start sm:items-center gap-3.5'>
          <div className='relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 flex items-center justify-center text-2xl shadow-xl shadow-orange-950/60 shrink-0'>
            <FaFire className='text-amber-100 animate-pulse' />
            {isLive && (
              <span className='absolute -top-1 -right-1 flex h-4 w-4'>
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75'></span>
                <span className='relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-stone-950'></span>
              </span>
            )}
          </div>

          <div>
            <div className='flex items-center gap-2.5 flex-wrap'>
              <h2 className='text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2'>
                Sunday Flash Offer Engine
              </h2>

              {isLive ? (
                <span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-950/60 border border-red-400/30 animate-pulse'>
                  <span className='w-2 h-2 rounded-full bg-white animate-ping' />
                  LIVE NOW ({formatTimer(remainingSec)})
                </span>
              ) : (
                <span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-xs'>
                  <FaClock className='text-[10px] text-amber-400' />
                  Scheduled: Sundays @ {status.formattedScheduleTime || '5:00 PM'} IST
                </span>
              )}
            </div>

            <p className='text-xs text-amber-200/80 font-medium mt-1 flex items-center gap-2 flex-wrap'>
              <span>
                Food Free up to <strong>₹{status.maxFoodValue || 149}</strong> (₹0 Food Cost)
              </span>
              <span className='text-stone-600 hidden sm:inline'>•</span>
              <span>
                0–3km: <strong>₹29</strong> | 3–14km: <strong>₹9/km</strong>
              </span>
              <span className='text-stone-600 hidden sm:inline'>•</span>
              <span className='text-emerald-400 font-semibold'>1 User = 1 Free Order</span>
            </p>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className='flex items-center gap-2.5 flex-wrap'>
          {isLive ? (
            <button
              onClick={() => setShowStopModal(true)}
              disabled={actionLoading}
              className='px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-red-950/50 active:scale-95 transition-all disabled:opacity-50'
            >
              <FaStop className='text-xs' />
              <span>Emergency Stop</span>
            </button>
          ) : (
            <button
              onClick={() => setShowTriggerModal(true)}
              disabled={actionLoading}
              className='px-5 py-2.5 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 hover:from-orange-600 hover:to-amber-600 text-stone-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-xl shadow-orange-950/50 active:scale-95 transition-all disabled:opacity-50 tracking-wide'
            >
              <FaPlay className='text-[10px]' />
              <span>Trigger Flash Window Now</span>
            </button>
          )}

          {/* Toggle Configuration Drawer */}
          <button
            onClick={() => setShowSettings((prev) => !prev)}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 border transition-all ${
              showSettings || isDirty
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
                : 'bg-stone-900/90 hover:bg-stone-800 text-stone-300 border-stone-700/80'
            }`}
          >
            <FaCog className={isDirty ? 'text-amber-400 animate-spin' : 'text-stone-400'} />
            <span>Rules & Timings</span>
            {isDirty && (
              <span className='w-2 h-2 rounded-full bg-amber-400 animate-ping' title='Unsaved changes' />
            )}
            {showSettings ? <FaChevronUp className='text-[10px]' /> : <FaChevronDown className='text-[10px]' />}
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => fetchStatus(true)}
            disabled={refreshing}
            title='Refresh live status'
            className='p-2.5 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white text-xs font-bold rounded-xl border border-stone-800 transition-all active:scale-95 disabled:opacity-50'
          >
            <FaSync className={`${refreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. LIVE HUD BANNER (Only visible when sale is active)
          ───────────────────────────────────────────────────────────── */}
      {isLive && (
        <div className='mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950/70 via-stone-900/90 to-amber-950/70 border border-red-500/40 shadow-inner relative overflow-hidden'>
          <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3'>
            <div>
              <div className='flex items-center gap-2'>
                <span className='px-2 py-0.5 rounded bg-red-600 text-white font-mono font-black text-[10px] tracking-wider uppercase'>
                  LIVE COUNTDOWN
                </span>
                <span className='text-xs font-bold text-stone-300'>
                  Window automatically closes at{' '}
                  <span className='text-amber-300 font-mono'>
                    {status.endTime ? new Date(status.endTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--'} IST
                  </span>
                </span>
              </div>
              <p className='text-xs text-stone-400 mt-1'>
                Customers on <span className='text-amber-300 font-semibold'>/food</span> page see live counter & get 100% discount on food up to ₹{status.maxFoodValue || 149}.
              </p>
            </div>

            {/* Monospace Countdown */}
            <div className='flex items-center gap-4 bg-stone-950/90 px-4 py-2.5 rounded-xl border border-red-500/30 shrink-0 self-start md:self-auto'>
              <div>
                <p className='text-[9px] uppercase tracking-wider text-red-400 font-bold'>Time Remaining</p>
                <p className='text-3xl font-black font-mono text-red-400 tracking-wider animate-pulse'>
                  {formatTimer(remainingSec)}
                </p>
              </div>
              <div className='h-8 w-px bg-stone-800' />
              <div>
                <p className='text-[9px] uppercase tracking-wider text-amber-400 font-bold'>Elapsed</p>
                <p className='text-xl font-black font-mono text-amber-300'>
                  {progressPercent}%
                </p>
              </div>
            </div>
          </div>

          {/* Animated Linear Progress Bar */}
          <div className='w-full bg-stone-950 rounded-full h-2.5 overflow-hidden border border-stone-800/80 p-0.5'>
            <div
              className='bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 h-full rounded-full transition-all duration-1000 ease-linear'
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. TELEMETRY CARDS GRID
          ───────────────────────────────────────────────────────────── */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5'>
        {/* Card 1: Schedule Window */}
        <div className='bg-stone-900/80 backdrop-blur-md rounded-2xl p-3.5 border border-amber-500/20 hover:border-amber-500/40 transition-all'>
          <p className='text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5'>
            <FaClock className='text-xs' />
            Schedule & Duration
          </p>
          <p className='text-xl font-black mt-1 text-white tracking-tight'>
            {status.formattedScheduleTime || '5:00 PM'} <span className='text-xs text-amber-300 font-medium font-sans'>IST</span>
          </p>
          <div className='flex items-center gap-1.5 mt-1.5 text-[10px] text-stone-400'>
            <span className='px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 font-semibold'>
              {status.durationMinutes || 5} Mins Window
            </span>
            <span>Every Sunday</span>
          </div>
        </div>

        {/* Card 2: Orders Claimed */}
        <div className='bg-stone-900/80 backdrop-blur-md rounded-2xl p-3.5 border border-amber-500/20 hover:border-amber-500/40 transition-all'>
          <p className='text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5'>
            <FaUsers className='text-xs' />
            Orders Claimed
          </p>
          <div className='flex items-baseline gap-2 mt-1'>
            <p className='text-2xl font-black text-white font-mono'>
              {status.claimedCount || 0}
            </p>
            <span className='text-[10px] text-stone-400'>unique claims</span>
          </div>
          <div className='flex items-center gap-1 mt-1.5 text-[10px] text-emerald-400 font-medium'>
            <FaShieldAlt className='text-[9px]' />
            <span>Anti-abuse: 1 order/user</span>
          </div>
        </div>

        {/* Card 3: Free Food Subsidized Cap */}
        <div className='bg-stone-900/80 backdrop-blur-md rounded-2xl p-3.5 border border-amber-500/20 hover:border-amber-500/40 transition-all'>
          <p className='text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5'>
            <FaBolt className='text-xs' />
            Food Subsidized Cap
          </p>
          <p className='text-xl font-black mt-1 text-emerald-400 font-mono'>
            ≤ ₹{status.maxFoodValue || 149} <span className='text-xs font-sans text-emerald-300 font-semibold'>100% FREE</span>
          </p>
          <p className='text-[10px] text-stone-400 mt-1.5 truncate'>
            Orders &gt; ₹{status.maxFoodValue || 149} are ineligible
          </p>
        </div>

        {/* Card 4: Delivery Pricing Matrix */}
        <div className='bg-stone-900/80 backdrop-blur-md rounded-2xl p-3.5 border border-amber-500/20 hover:border-amber-500/40 transition-all'>
          <p className='text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5'>
            <FaMotorcycle className='text-xs' />
            Delivery Rates
          </p>
          <p className='text-sm font-black mt-1.5 text-amber-200 tracking-tight'>
            ₹29 (0–3km) • ₹9/km (3–14km)
          </p>
          <p className='text-[10px] text-stone-400 mt-1.5'>
            Customer pays delivery fee directly
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. COLLAPSIBLE SCHEDULE & TIMING CONFIGURATION DRAWER
          ───────────────────────────────────────────────────────────── */}
      {showSettings && (
        <form
          onSubmit={handleSaveSchedule}
          className='bg-stone-950/95 rounded-2xl p-5 border border-amber-500/40 shadow-2xl relative animate-fadeIn'
        >
          {/* Header of Drawer */}
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3.5 mb-4'>
            <div className='flex items-center gap-2.5'>
              <div className='w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm'>
                <FaCog />
              </div>
              <div>
                <h3 className='text-sm font-black uppercase tracking-wider text-amber-300'>
                  Automation Timing & Platform Rule Controls
                </h3>
                <p className='text-[11px] text-stone-400'>
                  Automated background cron runs in <strong className='text-stone-300'>Asia/Kolkata (IST)</strong> timezone every Sunday.
                </p>
              </div>
            </div>

            {isDirty && (
              <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black animate-pulse'>
                <span>●</span>
                <span>Unsaved Modifications</span>
              </div>
            )}
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
            {/* Field 1: Scheduled Time */}
            <div className='space-y-2'>
              <label className='block text-xs font-black text-stone-200'>
                ⏰ Scheduled Run Time (IST)
              </label>
              <input
                type='time'
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className='w-full bg-stone-900 border border-stone-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-base font-black text-white outline-none font-mono tracking-wider'
                required
              />
              <p className='text-[10px] text-stone-400'>Quick 1-click Sunday presets:</p>
              <div className='flex items-center gap-1.5 flex-wrap'>
                {PRESET_TIMES.map((preset) => (
                  <button
                    key={preset.value}
                    type='button'
                    onClick={() => setScheduledTime(preset.value)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all ${
                      scheduledTime === preset.value
                        ? 'bg-amber-500 text-stone-950 font-black shadow-md shadow-amber-950'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Field 2: Duration Minutes */}
            <div className='space-y-2'>
              <label className='block text-xs font-black text-stone-200'>
                ⏳ Window Duration (Minutes)
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className='w-full bg-stone-900 border border-stone-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm font-black text-white outline-none'
              >
                {DURATION_PRESETS.map((mins) => (
                  <option key={mins} value={mins}>
                    {mins} Minutes {mins === 5 ? '(Standard/Recommended)' : ''}
                  </option>
                ))}
              </select>
              <p className='text-[10px] text-stone-400'>Preset shortcuts:</p>
              <div className='flex items-center gap-1.5 flex-wrap'>
                {DURATION_PRESETS.map((mins) => (
                  <button
                    key={mins}
                    type='button'
                    onClick={() => setDurationMinutes(mins)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all ${
                      Number(durationMinutes) === mins
                        ? 'bg-amber-500 text-stone-950 font-black shadow-md shadow-amber-950'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Field 3: Max Free Food Value */}
            <div className='space-y-2'>
              <label className='block text-xs font-black text-stone-200'>
                🍔 Free Food Cap (Subtotal Limit)
              </label>
              <div className='relative'>
                <span className='absolute left-3.5 top-2.5 text-stone-400 font-bold'>₹</span>
                <input
                  type='number'
                  min={49}
                  max={999}
                  value={maxFoodValue}
                  onChange={(e) => setMaxFoodValue(Number(e.target.value))}
                  className='w-full bg-stone-900 border border-stone-700 focus:border-amber-400 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-black text-white outline-none font-mono'
                  required
                />
              </div>
              <p className='text-[10px] text-stone-400'>Standard cap presets:</p>
              <div className='flex items-center gap-1.5 flex-wrap'>
                {FOOD_CAP_PRESETS.map((val) => (
                  <button
                    key={val}
                    type='button'
                    onClick={() => setMaxFoodValue(val)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all ${
                      Number(maxFoodValue) === val
                        ? 'bg-emerald-500 text-stone-950 font-black shadow-md shadow-emerald-950'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700'
                    }`}
                  >
                    ₹{val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dynamic Preview Box */}
          <div className='mt-4 p-3 rounded-xl bg-stone-900/60 border border-stone-800 text-xs text-stone-300 flex items-start gap-2.5'>
            <FaBroadcastTower className='text-amber-400 mt-0.5 shrink-0 text-sm' />
            <div className='space-y-1'>
              <p className='font-bold text-white'>
                Live Front-end & Push Broadcast Preview:
              </p>
              <p className='text-[11px] text-stone-400'>
                Banner: <span className='text-amber-300 font-semibold'>🔥 SUNDAY FLASH OFFER: Every Sunday @ {scheduledTime} IST • Food up to ₹{maxFoodValue} FREE ({durationMinutes} Mins Window)</span>
              </p>
              <p className='text-[11px] text-stone-400'>
                Push Notification: <span className='text-stone-300 font-medium'>"{durationMinutes} MINUTES. ₹{maxFoodValue} FOOD. ₹0 FOOD COST."</span>
              </p>
            </div>
          </div>

          {/* Action Bar inside Drawer */}
          <div className='flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-4 border-t border-stone-800/90'>
            <div className='flex items-center gap-2'>
              {isDirty && (
                <button
                  type='button'
                  onClick={handleResetForm}
                  className='px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold flex items-center gap-1.5 transition-all'
                >
                  <FaUndo className='text-[10px]' />
                  <span>Discard Changes</span>
                </button>
              )}
              <span className='text-[11px] text-stone-400 hidden sm:inline'>
                Cron re-schedules dynamically with zero server downtime.
              </span>
            </div>

            <div className='flex items-center gap-2.5 w-full sm:w-auto'>
              <button
                type='submit'
                disabled={savingSchedule || !isDirty}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md ${
                  isDirty
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/50 active:scale-95'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                }`}
              >
                <FaCheckCircle />
                <span>{savingSchedule ? 'Saving to Database...' : 'Save & Reschedule Engine'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. MODAL: TRIGGER LIVE OFFER CONFIRMATION
          ───────────────────────────────────────────────────────────── */}
      {showTriggerModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn'>
          <div className='bg-gradient-to-b from-stone-900 to-stone-950 border border-amber-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-white'>
            <button
              onClick={() => setShowTriggerModal(false)}
              className='absolute top-4 right-4 text-stone-400 hover:text-white p-1'
            >
              <FaTimes />
            </button>

            <div className='flex items-center gap-3 mb-4'>
              <div className='w-11 h-11 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center text-xl shrink-0'>
                <FaFire className='animate-pulse' />
              </div>
              <div>
                <h3 className='text-lg font-black text-white'>
                  Launch Flash Offer Now?
                </h3>
                <p className='text-xs text-amber-400 font-semibold'>
                  Platform-Wide Live Activation
                </p>
              </div>
            </div>

            <div className='space-y-2.5 text-xs text-stone-300 bg-stone-900/90 rounded-2xl p-4 border border-stone-800 mb-5'>
              <div className='flex items-center justify-between'>
                <span className='text-stone-400'>Offer Window:</span>
                <span className='font-mono font-bold text-amber-300'>{durationMinutes} Minutes strictly</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-stone-400'>Subsidized Free Food:</span>
                <span className='font-mono font-bold text-emerald-400'>Up to ₹{maxFoodValue} (₹0 food cost)</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-stone-400'>Delivery Charge:</span>
                <span className='font-bold text-white'>₹29 (0-3km) • ₹9/km (3-14km)</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-stone-400'>Abuse Protection:</span>
                <span className='font-bold text-emerald-400'>1 user = 1 order enforced</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-stone-400'>Push Broadcast:</span>
                <span className='font-bold text-orange-400'>Dispatches to ALL users</span>
              </div>
            </div>

            <div className='flex items-center gap-3'>
              <button
                onClick={() => setShowTriggerModal(false)}
                className='flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-all'
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerLaunch}
                disabled={actionLoading}
                className='flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-stone-950 text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-orange-950/60 active:scale-95 transition-all disabled:opacity-50'
              >
                <FaPlay className='text-[10px]' />
                <span>{actionLoading ? 'Activating...' : 'Yes, Launch Live'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. MODAL: EMERGENCY STOP CONFIRMATION
          ───────────────────────────────────────────────────────────── */}
      {showStopModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn'>
          <div className='bg-gradient-to-b from-stone-900 to-stone-950 border border-red-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-white'>
            <button
              onClick={() => setShowStopModal(false)}
              className='absolute top-4 right-4 text-stone-400 hover:text-white p-1'
            >
              <FaTimes />
            </button>

            <div className='flex items-center gap-3 mb-4'>
              <div className='w-11 h-11 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center text-xl shrink-0'>
                <FaExclamationTriangle />
              </div>
              <div>
                <h3 className='text-lg font-black text-white'>
                  Emergency Stop Offer?
                </h3>
                <p className='text-xs text-red-400 font-semibold'>
                  Prematurely Close Active Flash Window
                </p>
              </div>
            </div>

            <p className='text-xs text-stone-300 leading-relaxed mb-5 bg-stone-900/90 rounded-2xl p-4 border border-stone-800'>
              Stopping will immediately set the offer status to <strong>inactive</strong>. Customers browsing the food page will see the flash offer end instantly, and in-flight carts beyond normal checkout will lose the ₹{status.maxFoodValue || 149} discount.
            </p>

            <div className='flex items-center gap-3'>
              <button
                onClick={() => setShowStopModal(false)}
                className='flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-all'
              >
                Keep Running
              </button>
              <button
                onClick={handleStopOffer}
                disabled={actionLoading}
                className='flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-red-950/60 active:scale-95 transition-all disabled:opacity-50'
              >
                <FaStop className='text-[10px]' />
                <span>{actionLoading ? 'Stopping...' : 'Stop Offer Immediately'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminSundayFlashWidget
