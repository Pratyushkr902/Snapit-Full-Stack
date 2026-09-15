import React, { useEffect, useState } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import AxiosToastError from '../utils/AxiosToastError'
import toast from 'react-hot-toast'
import { IoStorefrontOutline, IoPower, IoRefreshOutline, IoAlertCircleOutline } from 'react-icons/io5'

const AdminStoreControlWidget = () => {
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [storeStatus, setStoreStatus] = useState({
    isClosedForToday: true,
    closedReason: 'Snapit is closed for today. Deliveries will resume tomorrow at 8:30 AM IST!',
    reopenTime: '8:30 AM Tomorrow',
    updatedAt: new Date(),
    updatedByName: 'Super Admin'
  })
  const [reasonInput, setReasonInput] = useState('')
  const [showReasonField, setShowReasonField] = useState(false)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const res = await Axios({
        ...SummaryApi.getStoreOperatingStatus
      })
      if (res.data?.success && res.data?.data) {
        setStoreStatus(res.data.data)
        setReasonInput(res.data.data.closedReason || '')
      }
    } catch {
      // fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleToggle = async (targetClosed) => {
    const actionText = targetClosed ? 'CLOSE Snapit for today' : 'REOPEN Snapit now'
    if (!window.confirm(`Are you sure you want to ${actionText}? All customer checkouts and app screens will immediately update.`)) {
      return
    }

    try {
      setToggling(true)
      const res = await Axios({
        ...SummaryApi.toggleStoreOperatingStatus,
        data: {
          isClosedForToday: targetClosed,
          closedReason: reasonInput.trim() || undefined
        }
      })
      if (res.data?.success) {
        setStoreStatus(res.data.data)
        toast.success(res.data.message || (targetClosed ? 'Store Closed for Today' : 'Store Reopened!'))
        // Dispatch local event so header, overlay and cart update immediately
        window.dispatchEvent(new CustomEvent('snapit_store_status_changed', { detail: res.data.data }))
      }
    } catch (err) {
      AxiosToastError(err)
    } finally {
      setToggling(false)
    }
  }

  const isClosed = Boolean(storeStatus.isClosedForToday)

  return (
    <div className={`mb-6 rounded-3xl p-5 sm:p-6 transition-all border-2 shadow-sm ${
      isClosed
        ? 'bg-gradient-to-br from-rose-50 via-amber-50/60 to-rose-50 border-rose-300 dark:bg-rose-950/30 dark:border-rose-800'
        : 'bg-gradient-to-br from-emerald-50 via-teal-50/50 to-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800'
    }`}>
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm ${
            isClosed
              ? 'bg-rose-600 text-white animate-pulse'
              : 'bg-emerald-600 text-white'
          }`}>
            <IoStorefrontOutline size={26} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Store Operating Status
              </h2>
              <span
                style={{
                  backgroundColor: isClosed ? '#dc2626' : '#16a34a',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 900,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
                }}
              >
                <span>{isClosed ? '⛔' : '🟢'}</span>
                <span>{isClosed ? 'CLOSED FOR TODAY' : 'ACTIVE & OPEN'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
              {isClosed
                ? 'Store is shut for today. Customers see rolling shutter countdown and checkouts are blocked.'
                : 'Store is live and taking orders within operating hours (8:30 AM – 8:30 PM IST).'}
            </p>
          </div>
        </div>

        {/* 1-Click Action Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading || toggling}
            title="Refresh status"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all active:scale-95"
          >
            <IoRefreshOutline size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          {isClosed ? (
            <button
              type="button"
              disabled={loading || toggling}
              onClick={() => handleToggle(false)}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
            >
              <IoPower size={18} />
              <span>{toggling ? 'Reopening...' : 'Reopen Store Now 🟢'}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={loading || toggling}
              onClick={() => handleToggle(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md shadow-rose-600/30 transition-all disabled:opacity-50"
            >
              <IoPower size={18} />
              <span>{toggling ? 'Closing...' : 'Close Store for Today ⛔'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Prominent Status Callout Banner */}
      <div
        style={{
          marginTop: '14px',
          padding: '10px 14px',
          borderRadius: '14px',
          backgroundColor: isClosed ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
          border: `1.5px solid ${isClosed ? '#f87171' : '#4ade80'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>{isClosed ? '⛔' : '⚡'}</span>
          <div>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 900, color: isClosed ? '#dc2626' : '#16a34a', letterSpacing: '0.02em' }}>
              {isClosed ? 'CURRENT STATUS: CLOSED FOR TODAY' : 'CURRENT STATUS: LIVE & ACCEPTING ORDERS'}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', fontWeight: 600, color: isClosed ? '#b91c1c' : '#15803d' }}>
              {isClosed
                ? 'All customer checkout buttons locked. Deliveries resume tomorrow 8:30 AM IST.'
                : 'Customer orders and 10-minute deliveries are fully enabled across grocery & food.'}
            </p>
          </div>
        </div>
      </div>

      {/* Detail info & optional custom message editor */}
      <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="text-slate-600 dark:text-slate-400">
          <span className="font-semibold">Last Modified: </span>
          <strong className="text-slate-800 dark:text-slate-200">
            {new Date(storeStatus.updatedAt).toLocaleString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
            })}
          </strong>
          {storeStatus.updatedByName && (
            <span> by <strong className="text-slate-800 dark:text-slate-200">{storeStatus.updatedByName}</strong></span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowReasonField(prev => !prev)}
          className="text-xs font-bold text-slate-700 dark:text-slate-300 underline hover:text-slate-900 self-start sm:self-auto"
        >
          {showReasonField ? 'Hide announcement note' : '✏️ Custom closed notice'}
        </button>
      </div>

      {showReasonField && (
        <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800 animate-fadeUp">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Customer-Facing Notice (Shown on rolling shutter overlay & banners):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={reasonInput}
              onChange={e => setReasonInput(e.target.value)}
              placeholder="e.g. Snapit is closed for today. We are resting and packing fresh stock!"
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-slate-900"
            />
            <button
              type="button"
              disabled={toggling}
              onClick={() => handleToggle(isClosed)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all disabled:opacity-50"
            >
              Save Notice
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminStoreControlWidget

