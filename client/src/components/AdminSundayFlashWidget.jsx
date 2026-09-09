import React, { useState, useEffect, useRef } from 'react'
import Axios from '../utils/Axios'
import toast from 'react-hot-toast'
import { FaFire, FaPlay, FaStop, FaClock, FaUsers, FaMotorcycle, FaCog, FaCheck } from 'react-icons/fa'

const PRESET_TIMES = [
  { label: '5:00 PM', value: '17:00' },
  { label: '6:00 PM', value: '18:00' },
  { label: '7:00 PM', value: '19:00' },
  { label: '8:00 PM', value: '20:00' },
  { label: '9:00 PM', value: '21:00' },
]

const AdminSundayFlashWidget = () => {
  const [status, setStatus] = useState({
    isActive: false,
    remainingSeconds: 0,
    claimedCount: 0,
    endTime: null,
    scheduledTime: '17:00',
    formattedScheduleTime: '5:00 PM',
    durationMinutes: 5,
    maxFoodValue: 149,
    rules: {
      maxFoodValue: 149,
      baseKm: 3,
      baseCharge: 29,
      perKmRate: 9,
      maxKm: 14,
    }
  })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const intervalRef = useRef(null)

  // Scheduling Form State
  const [scheduledTime, setScheduledTime] = useState('17:00')
  const [durationMinutes, setDurationMinutes] = useState(5)
  const [maxFoodValue, setMaxFoodValue] = useState(149)
  const [savingSchedule, setSavingSchedule] = useState(false)

  const fetchStatus = async () => {
    try {
      const res = await Axios({
        url: '/api/sunday-flash/status',
        method: 'get'
      })
      if (res.data?.success && res.data?.data) {
        const d = res.data.data
        setStatus(d)
        setCountdown(d.remainingSeconds || 0)
        if (d.scheduledTime) setScheduledTime(d.scheduledTime)
        if (d.durationMinutes) setDurationMinutes(d.durationMinutes)
        if (d.maxFoodValue) setMaxFoodValue(d.maxFoodValue)
      }
    } catch (err) {
      console.error('Failed to fetch Sunday flash status:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const poller = setInterval(fetchStatus, 15000)
    return () => clearInterval(poller)
  }, [])

  const isLive = Boolean(status.isLive || status.isActive)

  // Local ticking timer
  useEffect(() => {
    if (isLive && countdown > 0) {
      intervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            fetchStatus()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isLive, countdown > 0])

  const handleTrigger = async () => {
    const confirm = window.confirm(
      `🔥 START ${durationMinutes}-MINUTE SUNDAY FLASH OFFER NOW?\n\n` +
      `• Food up to ₹${maxFoodValue} will be 100% FREE for all customers\n` +
      '• 0–3km: ₹29 | 3–14km: ₹9/km delivery\n' +
      '• A broadcast push notification will be sent to all users\n' +
      `• Timer runs strictly for ${durationMinutes} minutes`
    )
    if (!confirm) return

    try {
      setActionLoading(true)
      const res = await Axios({
        url: '/api/sunday-flash/trigger',
        method: 'post',
        data: { durationMinutes }
      })
      if (res.data?.success) {
        toast.success('🔥 Sunday Flash Offer is now LIVE! Notifications sent.')
        await fetchStatus()
      } else {
        toast.error(res.data?.message || 'Failed to trigger offer')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to trigger Sunday Flash')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStop = async () => {
    const confirm = window.confirm('Are you sure you want to stop the Sunday Flash Offer immediately?')
    if (!confirm) return

    try {
      setActionLoading(true)
      const res = await Axios({
        url: '/api/sunday-flash/stop',
        method: 'post'
      })
      if (res.data?.success) {
        toast.success('Sunday Flash Offer stopped.')
        await fetchStatus()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to stop offer')
    } finally {
      setActionLoading(false)
    }
  }

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
        }
      })
      if (res.data?.success) {
        toast.success(res.data.message || 'Schedule updated successfully! 🎉')
        await fetchStatus()
      } else {
        toast.error(res.data?.message || 'Failed to update schedule')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update schedule')
    } finally {
      setSavingSchedule(false)
    }
  }

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className='bg-gradient-to-br from-stone-900 via-amber-950 to-stone-950 rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-6 text-white border border-amber-500/30 shadow-xl overflow-hidden relative'>
      {/* Background ambient glow */}
      <div className='absolute -right-10 -top-10 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none' />

      {/* Header bar */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-500/20 pb-4 mb-4'>
        <div className='flex items-center gap-3'>
          <div className='w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-xl shadow-lg shadow-orange-950'>
            <FaFire className='text-amber-100 animate-pulse' />
          </div>
          <div>
            <div className='flex items-center gap-2 flex-wrap'>
              <h2 className='text-lg sm:text-xl font-black text-white tracking-tight'>
                Sunday Flash Offer Engine
              </h2>
              {isLive ? (
                <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-red-500 text-white animate-pulse shadow-xs'>
                  <span className='w-2 h-2 rounded-full bg-white animate-ping' />
                  LIVE NOW
                </span>
              ) : (
                <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-800 text-amber-300 border border-amber-500/30'>
                  ⏰ Scheduled: Sundays @ {status.formattedScheduleTime || '5:00 PM'} IST
                </span>
              )}
            </div>
            <p className='text-xs text-amber-200/80 font-medium mt-0.5'>
              Food Free up to ₹{status.maxFoodValue || 149} (₹0 Food Cost) • 0–3km: ₹29, 3–14km: ₹9/km • 1 user = 1 order
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className='flex items-center gap-2.5 flex-wrap'>
          {isLive ? (
            <button
              onClick={handleStop}
              disabled={actionLoading}
              className='px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50'
            >
              <FaStop />
              <span>Stop Offer Early</span>
            </button>
          ) : (
            <button
              onClick={handleTrigger}
              disabled={actionLoading}
              className='px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-orange-950/40 active:scale-95 transition-all disabled:opacity-50'
            >
              <FaPlay className='text-[10px]' />
              <span>{actionLoading ? 'Starting...' : `🚀 Trigger ${durationMinutes}-Min Flash Offer Now`}</span>
            </button>
          )}
          <button
            onClick={fetchStatus}
            className='px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold rounded-xl border border-stone-700'
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats and Timer Grid */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5'>
        {/* Countdown Timer */}
        <div className='bg-stone-900/80 rounded-xl p-3 border border-amber-500/20'>
          <p className='text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1'>
            <FaClock className='text-xs' />
            Window Timer
          </p>
          <p className={`text-2xl font-black mt-1 font-mono ${isLive ? 'text-orange-400 animate-pulse' : 'text-stone-400'}`}>
            {isLive ? formatTimer(countdown) : `${String(durationMinutes).padStart(2, '0')}:00`}
          </p>
          <p className='text-[10px] text-stone-400 mt-0.5'>
            {isLive ? 'Window ends automatically' : `Duration: ${durationMinutes} Minutes`}
          </p>
        </div>

        {/* Claimed Orders */}
        <div className='bg-stone-900/80 rounded-xl p-3 border border-amber-500/20'>
          <p className='text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1'>
            <FaUsers className='text-xs' />
            Orders Claimed
          </p>
          <p className='text-2xl font-black mt-1 text-white'>
            {status.claimedCount || 0}
          </p>
          <p className='text-[10px] text-stone-400 mt-0.5'>
            Max 1 order per user/mobile
          </p>
        </div>

        {/* Max Food Free Cap */}
        <div className='bg-stone-900/80 rounded-xl p-3 border border-amber-500/20'>
          <p className='text-[10px] font-bold text-amber-400 uppercase tracking-wider'>
            Eligible Food Subtotal
          </p>
          <p className='text-2xl font-black mt-1 text-emerald-400'>
            ≤ ₹{status.maxFoodValue || 149} FREE
          </p>
          <p className='text-[10px] text-stone-400 mt-0.5'>
            Orders &gt; ₹{status.maxFoodValue || 149} pay full price
          </p>
        </div>

        {/* Delivery Rules */}
        <div className='bg-stone-900/80 rounded-xl p-3 border border-amber-500/20'>
          <p className='text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1'>
            <FaMotorcycle className='text-xs' />
            Delivery Rates
          </p>
          <p className='text-sm font-black mt-1.5 text-amber-200'>
            ₹29 (0–3km) • ₹9/km (3–14km)
          </p>
          <p className='text-[10px] text-stone-400 mt-0.5'>
            Customer pays delivery fee
          </p>
        </div>
      </div>

      {/* ── SUPER ADMIN SCHEDULE & TIMING CONFIGURATION PANEL ── */}
      <form onSubmit={handleSaveSchedule} className='bg-stone-950/90 rounded-2xl p-4 border border-amber-500/30'>
        <div className='flex items-center justify-between gap-2 border-b border-stone-800 pb-3 mb-3'>
          <div className='flex items-center gap-2'>
            <FaCog className='text-amber-400 text-sm' />
            <span className='text-xs font-black uppercase tracking-wider text-amber-300'>
              Super Admin Timing & Rule Controls
            </span>
          </div>
          <span className='text-[11px] text-stone-400 font-mono'>
            Runs automatically every Sunday in Asia/Kolkata (IST)
          </span>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
          {/* Time Picker */}
          <div>
            <label className='block text-[11px] font-bold text-stone-300 mb-1.5'>
              ⏰ Scheduled Time (IST)
            </label>
            <input
              type='time'
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className='w-full bg-stone-900 border border-stone-700 focus:border-amber-500 rounded-xl px-3 py-2 text-sm font-black text-white outline-none font-mono tracking-wider'
              required
            />
            {/* Quick Presets */}
            <div className='flex items-center gap-1.5 mt-2 flex-wrap'>
              {PRESET_TIMES.map((preset) => (
                <button
                  key={preset.value}
                  type='button'
                  onClick={() => setScheduledTime(preset.value)}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all ${
                    scheduledTime === preset.value
                      ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className='block text-[11px] font-bold text-stone-300 mb-1.5'>
              ⏳ Offer Duration (Minutes)
            </label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className='w-full bg-stone-900 border border-stone-700 focus:border-amber-500 rounded-xl px-3 py-2 text-sm font-black text-white outline-none'
            >
              <option value={3}>3 Minutes</option>
              <option value={5}>5 Minutes (Recommended)</option>
              <option value={10}>10 Minutes</option>
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes</option>
            </select>
            <p className='text-[10px] text-stone-500 mt-1.5'>
              Strict countdown window before offer expires
            </p>
          </div>

          {/* Max Food Value */}
          <div>
            <label className='block text-[11px] font-bold text-stone-300 mb-1.5'>
              🍔 Max Free Food Value (₹)
            </label>
            <input
              type='number'
              min={49}
              max={500}
              value={maxFoodValue}
              onChange={(e) => setMaxFoodValue(Number(e.target.value))}
              className='w-full bg-stone-900 border border-stone-700 focus:border-amber-500 rounded-xl px-3 py-2 text-sm font-black text-white outline-none font-mono'
              required
            />
            <p className='text-[10px] text-stone-500 mt-1.5'>
              Food orders &gt; ₹{maxFoodValue} will not be free
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className='flex items-center justify-between pt-3 mt-3 border-t border-stone-800/80'>
          <p className='text-[11px] text-amber-200/70 font-medium'>
            Saving dynamically reschedules the automated cron and updates the food page announcement banner immediately.
          </p>
          <button
            type='submit'
            disabled={savingSchedule}
            className='px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-950/40 disabled:opacity-50 whitespace-nowrap'
          >
            <FaCheck />
            <span>{savingSchedule ? 'Saving...' : 'Save Schedule Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default AdminSundayFlashWidget
