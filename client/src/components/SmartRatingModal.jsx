import React, { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { Capacitor } from '@capacitor/core'
import toast from 'react-hot-toast'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'

const PLAYSTORE_PACKAGE = 'com.snapit.grocery'
const PLAYSTORE_HTTP = `https://play.google.com/store/apps/details?id=${PLAYSTORE_PACKAGE}`
const PLAYSTORE_MARKET = `market://details?id=${PLAYSTORE_PACKAGE}`
const SUPPORT_WHATSAPP = '919631497787'

const RATING_OPTIONS = [
  { value: 1, emoji: '😞', label: 'Poor' },
  { value: 2, emoji: '😕', label: 'Fair' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '🤩', label: 'Amazing' },
]

const ISSUE_TAGS = [
  '🕒 Delivery Delay',
  '📦 Missing / Wrong Item',
  '🍲 Food Quality',
  '🛵 Rider Behavior',
  '💳 Payment / Pricing',
  '❓ Other'
]

export default function SmartRatingModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState('rate') // 'rate' | 'happy' | 'unhappy'
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [selectedIssues, setSelectedIssues] = useState([])
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const user = useSelector(state => state.user)
  const orders = useSelector(state => state.orders?.order || [])

  const openModal = useCallback(() => {
    setRating(0)
    setStep('rate')
    setSelectedIssues([])
    setComment('')
    setIsOpen(true)
  }, [])

  const closeModal = useCallback((daysToDismiss = 7) => {
    setIsOpen(false)
    if (daysToDismiss > 0) {
      const dismissUntil = Date.now() + daysToDismiss * 24 * 60 * 60 * 1000
      localStorage.setItem('snapit_rating_dismissed_until', String(dismissUntil))
    }
  }, [])

  // 1. Listen for global custom event to open modal from anywhere
  useEffect(() => {
    const handleCustomOpen = () => openModal()
    window.addEventListener('open-smart-rating', handleCustomOpen)
    return () => window.removeEventListener('open-smart-rating', handleCustomOpen)
  }, [openModal])

  // 2. Automatic trigger after completed/delivered order
  useEffect(() => {
    const hasRated = localStorage.getItem('snapit_has_rated_playstore') === 'true'
    if (hasRated) return

    const dismissedUntil = Number(localStorage.getItem('snapit_rating_dismissed_until') || 0)
    if (Date.now() < dismissedUntil) return

    // Check if customer has at least one delivered order
    const hasDeliveredOrder = orders.some(o => {
      const s = (o.order_status || o.delivery_status || o.status || '').toLowerCase()
      return s === 'delivered'
    })

    if (hasDeliveredOrder && user?._id) {
      const timer = setTimeout(() => {
        // Double check route isn't checkout or active order placement
        const path = window.location.pathname.toLowerCase()
        if (!path.includes('checkout') && !path.includes('payment')) {
          openModal()
        }
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [orders, user, openModal])

  const handleSelectRating = (val) => {
    setRating(val)
    if (val >= 4) {
      setStep('happy')
    } else {
      setStep('unhappy')
    }
  }

  const toggleIssueTag = (tag) => {
    setSelectedIssues(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const handleOpenPlayStore = () => {
    localStorage.setItem('snapit_has_rated_playstore', 'true')
    toast.success('Thank you for supporting Snapit! ⭐', { duration: 4000 })
    closeModal(365) // Dismiss for a year

    if (Capacitor.isNativePlatform()) {
      window.location.href = PLAYSTORE_MARKET
      setTimeout(() => {
        window.open(PLAYSTORE_HTTP, '_system')
      }, 500)
    } else {
      window.open(PLAYSTORE_HTTP, '_blank', 'noopener,noreferrer')
    }
  }

  const handleWhatsAppComplaint = () => {
    closeModal(14)
    const issueStr = selectedIssues.length > 0 ? selectedIssues.join(', ') : 'Delivery experience'
    const noteStr = comment.trim() ? ` Notes: ${comment.trim()}` : ''
    const msg = `Hi Snapit Support, I gave a rating of ${rating}/5 on the app. Issue: ${issueStr}.${noteStr}`
    const waUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(msg)}`
    
    window.open(waUrl, '_blank')
  }

  const handleSubmitPrivateFeedback = async () => {
    try {
      setIsSubmitting(true)
      // Optional background logging / user feedback capture
      try {
        await Axios({
          method: 'POST',
          url: '/api/user/feedback',
          data: {
            rating,
            issues: selectedIssues,
            comment: comment.trim(),
            userId: user?._id
          }
        }).catch(() => {})
      } catch {}

      toast.success('Thank you! Your feedback has been sent directly to our management team 🙏', { duration: 5000 })
      closeModal(14)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in'>
      <div 
        className='relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 overflow-hidden transform transition-all animate-scale-up'
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => closeModal(7)}
          className='absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center text-sm font-bold active:scale-95 transition-all'
          aria-label='Close'
        >
          ✕
        </button>

        {/* ── STEP 1: INITIAL 5-STAR SELECTION ── */}
        {step === 'rate' && (
          <div className='text-center'>
            <div className='w-16 h-16 bg-amber-100 dark:bg-amber-950/50 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-xs mb-4'>
              🛵
            </div>
            <h3 className='text-lg font-black text-slate-900 dark:text-white leading-tight mb-1'>
              How was your Snapit experience?
            </h3>
            <p className='text-xs text-slate-500 dark:text-slate-400 mb-6'>
              Your honest feedback helps us improve fast delivery in Paliganj & campus!
            </p>

            {/* Stars Row */}
            <div className='flex justify-center items-center gap-2 mb-3'>
              {[1, 2, 3, 4, 5].map(starVal => {
                const isHovered = hoveredRating >= starVal
                const isSelected = rating >= starVal
                const active = isHovered || isSelected
                return (
                  <button
                    key={starVal}
                    type='button'
                    onMouseEnter={() => setHoveredRating(starVal)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => handleSelectRating(starVal)}
                    className='text-3xl sm:text-4xl transition-transform transform active:scale-125 hover:scale-110 focus:outline-none p-1'
                    aria-label={`${starVal} stars`}
                  >
                    {active ? '⭐' : '☆'}
                  </button>
                )
              })}
            </div>

            {/* Emoji & Label indicator */}
            <div className='h-6 flex items-center justify-center mb-6'>
              {hoveredRating > 0 ? (
                <span className='text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1'>
                  <span>{RATING_OPTIONS[hoveredRating - 1]?.emoji}</span>
                  <span>{RATING_OPTIONS[hoveredRating - 1]?.label}</span>
                </span>
              ) : (
                <span className='text-xs text-slate-400'>Tap a star to rate</span>
              )}
            </div>

            <button
              type='button'
              onClick={() => closeModal(7)}
              className='text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors'
            >
              Remind me later
            </button>
          </div>
        )}

        {/* ── STEP 2A: HAPPY CUSTOMER (4 or 5 STARS -> PLAY STORE) ── */}
        {step === 'happy' && (
          <div className='text-center'>
            <div className='w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-xs mb-3 animate-bounce'>
              🎉
            </div>
            <div className='inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-black px-2.5 py-0.5 rounded-full mb-2'>
              {'⭐'.repeat(rating)} Loved it!
            </div>
            <h3 className='text-lg font-black text-slate-900 dark:text-white leading-tight mb-2'>
              We are thrilled you loved it! 🥰
            </h3>
            <p className='text-xs text-slate-600 dark:text-slate-300 mb-6 leading-relaxed'>
              Snapit is a local student &amp; youth startup in Paliganj. Your 5-star review takes only <strong>10 seconds</strong> on Google Play Store and helps our local riders immensely! 🙏
            </p>

            <button
              type='button'
              onClick={handleOpenPlayStore}
              className='w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-green-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all mb-3'
            >
              <span>⭐</span>
              <span>Rate 5 Stars on Play Store</span>
            </button>

            <button
              type='button'
              onClick={() => closeModal(14)}
              className='text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-1'
            >
              Maybe later
            </button>
          </div>
        )}

        {/* ── STEP 2B: UNHAPPY CUSTOMER (1, 2, or 3 STARS -> INTERNAL CARE) ── */}
        {step === 'unhappy' && (
          <div className='text-left'>
            <div className='flex items-center gap-2 mb-2'>
              <span className='text-2xl'>😔</span>
              <div>
                <h3 className='text-base font-black text-slate-900 dark:text-white leading-tight'>
                  We are so sorry!
                </h3>
                <p className='text-xs text-slate-500 dark:text-slate-400'>
                  We want to fix this for you right away.
                </p>
              </div>
            </div>

            <p className='text-xs font-bold text-slate-700 dark:text-slate-200 mt-4 mb-2'>
              What went wrong? (Select all that apply)
            </p>

            {/* Quick Issue Chips */}
            <div className='flex flex-wrap gap-1.5 mb-4'>
              {ISSUE_TAGS.map(tag => {
                const isSelected = selectedIssues.includes(tag)
                return (
                  <button
                    key={tag}
                    type='button'
                    onClick={() => toggleIssueTag(tag)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                      isSelected
                        ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>

            {/* Optional note */}
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder='Optional: Tell us more so we can assist you...'
              rows={2}
              className='w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 outline-none focus:border-rose-400 mb-4 resize-none'
            />

            {/* Actions: Direct WhatsApp resolution (protects Play Store rating!) */}
            <div className='space-y-2'>
              <button
                type='button'
                onClick={handleWhatsAppComplaint}
                className='w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all'
              >
                <span>💬</span>
                <span>Chat with Support on WhatsApp</span>
              </button>

              <button
                type='button'
                disabled={isSubmitting}
                onClick={handleSubmitPrivateFeedback}
                className='w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs active:scale-95 transition-all'
              >
                {isSubmitting ? 'Submitting...' : 'Submit Private Feedback'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
