import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'

const EMOJIS = [
  { icon: '😞', label: 'Poor',    value: 1, color: 'border-red-200    bg-red-50    hover:bg-red-100'    },
  { icon: '😐', label: 'Okay',    value: 2, color: 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100' },
  { icon: '😊', label: 'Good',    value: 3, color: 'border-blue-200   bg-blue-50   hover:bg-blue-100'   },
  { icon: '😍', label: 'Great',   value: 4, color: 'border-green-200  bg-green-50  hover:bg-green-100'  },
  { icon: '🤩', label: 'Amazing', value: 5, color: 'border-purple-200 bg-purple-50 hover:bg-purple-100' },
]

// Brand color map for scratch card backgrounds
const BRAND_COLORS = {
  'Nykaa':      { bg: '#FBEAF0', text: '#72243E' },
  'boAt':       { bg: '#EEEDFE', text: '#3C3489' },
  'Mamaearth':  { bg: '#E1F5EE', text: '#085041' },
  'Wow Skin':   { bg: '#FAECE7', text: '#712B13' },
  'mCaffeine':  { bg: '#FAEEDA', text: '#633806' },
  'Plum':       { bg: '#E6F1FB', text: '#0C447C' },
  'Minimalist': { bg: '#F1EFE8', text: '#444441' },
  'Beardo':     { bg: '#EAF3DE', text: '#27500A' },
}

// ── Single scratch card component ──────────────────────────────────────────────
const ScratchCard = ({ card }) => {
  const canvasRef  = useRef(null)
  const containerRef = useRef(null)
  const painting   = useRef(false)
  const revealed   = useRef(false)
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)

  const colors = BRAND_COLORS[card.brand] || { bg: '#F1EFE8', text: '#444441' }

  useEffect(() => {
    const canvas    = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const w = container.offsetWidth
    const h = container.offsetHeight
    canvas.width  = w
    canvas.height = h

    const ctx = canvas.getContext('2d')
    // Draw scratch surface
    ctx.fillStyle = colors.bg
    ctx.fillRect(0, 0, w, h)
    // Subtle dot pattern
    ctx.fillStyle = 'rgba(0,0,0,0.06)'
    for (let r = 0; r < h; r += 7)
      for (let c = 0; c < w; c += 7)
        if ((r + c) % 14 === 0) ctx.fillRect(c, r, 3, 3)
    // Hint text
    ctx.fillStyle = colors.text
    ctx.font = 'bold 10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('scratch here', w / 2, h / 2 + 3)
  }, [])

  const getPos = (e, rect) => {
    if (e.touches) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const scratch = (x, y) => {
    if (revealed.current) return
    const ctx = canvasRef.current.getContext('2d')
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(x, y, 18, 0, Math.PI * 2)
    ctx.fill()
    // Check how much is cleared
    const data = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height).data
    let clear = 0
    for (let i = 3; i < data.length; i += 4) if (data[i] < 128) clear++
    if (clear / (canvasRef.current.width * canvasRef.current.height) > 0.42) {
      revealed.current = true
      setTimeout(() => {
        canvasRef.current.style.opacity = '0'
        setDone(true)
      }, 200)
    }
  }

  const onMouseDown = e => { painting.current = true; const r = canvasRef.current.getBoundingClientRect(); const p = getPos(e, r); scratch(p.x, p.y) }
  const onMouseMove = e => { if (!painting.current) return; const r = canvasRef.current.getBoundingClientRect(); const p = getPos(e, r); scratch(p.x, p.y) }
  const onMouseUp   = () => { painting.current = false }
  const onTouchStart = e => { e.preventDefault(); painting.current = true; const r = canvasRef.current.getBoundingClientRect(); const p = getPos(e, r); scratch(p.x, p.y) }
  const onTouchMove  = e => { e.preventDefault(); if (!painting.current) return; const r = canvasRef.current.getBoundingClientRect(); const p = getPos(e, r); scratch(p.x, p.y) }
  const onTouchEnd   = () => { painting.current = false }

  const copyCode = () => {
    navigator.clipboard.writeText(card.code).then(() => {
      setCopied(true)
      toast.success(`${card.code} copied!`)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      ref={containerRef}
      className='relative rounded-2xl overflow-hidden border border-slate-100'
      style={{ aspectRatio: '2/3' }}
    >
      {/* Revealed content underneath */}
      <div className='absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 bg-white'>
        <p className='text-[9px] font-black text-slate-400 uppercase tracking-wide'>{card.brand}</p>
        <p className='text-lg font-black text-slate-800 text-center leading-tight'>{card.discount}</p>
        <button
          onClick={copyCode}
          className='mt-1 px-2 py-1 rounded-lg text-[8px] font-black tracking-wider border border-dashed border-slate-300 bg-slate-50 text-slate-600 active:scale-95 transition-all'
        >
          {copied ? '✓ COPIED' : card.code}
        </button>
        <p className='text-[8px] text-slate-400 mt-0.5'>Valid {card.expires_days} days</p>
      </div>

      {/* Scratch canvas on top */}
      <canvas
        ref={canvasRef}
        className='absolute inset-0 rounded-2xl transition-opacity duration-300 cursor-cell'
        style={{ zIndex: 2 }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />
    </div>
  )
}

// ── Main Success page ──────────────────────────────────────────────────────────
const Success = () => {
  const location = useLocation()
  const isOrder     = Boolean(location?.state?.text)
  const scratchCards = location?.state?.scratch_cards || []   // ✅ passed from CheckoutPage

  const [selectedRating, setSelectedRating] = useState(null)
  const [comment, setComment]               = useState('')
  const [submitted, setSubmitted]           = useState(false)
  const [submitting, setSubmitting]         = useState(false)
  const [showCards, setShowCards]           = useState(false)

  // Auto-show cards after 1.2s so success animation plays first
  useEffect(() => {
    if (isOrder && scratchCards.length > 0) {
      const t = setTimeout(() => setShowCards(true), 1200)
      return () => clearTimeout(t)
    }
  }, [isOrder, scratchCards])

  const handleFeedbackSubmit = async () => {
    if (!selectedRating) return toast.error('Please select a rating')
    try {
      setSubmitting(true)
      await new Promise(resolve => setTimeout(resolve, 800))
      setSubmitted(true)
      toast.success('Thank you for your feedback! 🙏')
    } catch {
      toast.error('Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-start pt-12 px-4 pb-20'>

      {/* Success animation */}
      <div className='flex flex-col items-center gap-4 mb-8'>
        <div className='w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-bounce'>
          <span className='text-5xl'>🎉</span>
        </div>
        <div className='text-center'>
          <h1 className='text-2xl font-black text-slate-900'>
            {isOrder ? 'Order Placed!' : 'Payment Successful!'}
          </h1>
          <p className='text-slate-500 mt-1 text-sm'>
            {isOrder
              ? 'Your groceries are being packed and will arrive in 10 minutes ⚡'
              : 'Your payment was processed successfully'}
          </p>
        </div>
      </div>

      {/* Order status pills */}
      {isOrder && (
        <div className='flex items-center gap-2 mb-8 flex-wrap justify-center'>
          {['Order Placed', 'Packing', 'Out for Delivery', 'Delivered'].map((step, i) => (
            <React.Fragment key={step}>
              <div className={`text-[10px] font-black px-3 py-1.5 rounded-full ${i === 0 ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                {step}
              </div>
              {i < 3 && <span className='text-slate-300 text-xs'>→</span>}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ✅ SCRATCH CARDS SECTION — shows for ALL users after every order */}
      {isOrder && showCards && scratchCards.length > 0 && (
        <div className='w-full max-w-sm mb-6'>
          <div className='bg-white rounded-3xl shadow-xl border border-slate-100 p-5'>
            <div className='flex items-center gap-2 mb-1'>
              <span className='text-xl'>🎟️</span>
              <p className='font-black text-slate-800 text-base'>Your scratch cards</p>
            </div>
            <p className='text-xs text-slate-400 mb-4'>
              Scratch to reveal exclusive brand discounts — your reward for ordering!
            </p>
            <div className='grid grid-cols-3 gap-2.5'>
              {scratchCards.map((card, i) => (
                <ScratchCard key={i} card={card} />
              ))}
            </div>
            <p className='text-[10px] text-slate-400 text-center mt-3'>
              Scratch 40% of the card to reveal your code
            </p>
          </div>
        </div>
      )}

      {/* ✅ Fallback if scratch cards didn't come through */}
      {isOrder && showCards && scratchCards.length === 0 && (
        <div className='w-full max-w-sm mb-6'>
          <div className='bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-4 text-center'>
            <p className='text-2xl mb-1'>🎟️</p>
            <p className='text-xs font-bold text-slate-500'>Scratch cards loading...</p>
            <p className='text-[10px] text-slate-400 mt-1'>Check your orders page in a moment</p>
          </div>
        </div>
      )}

      {/* Feedback Card */}
      {isOrder && !submitted && (
        <div className='w-full max-w-sm bg-white rounded-3xl shadow-xl border border-slate-100 p-6 mb-6'>
          <div className='text-center mb-5'>
            <p className='font-black text-slate-800 text-base'>How was your experience?</p>
            <p className='text-xs text-slate-400 mt-1'>Your feedback helps us improve</p>
          </div>
          <div className='flex justify-between gap-2 mb-5'>
            {EMOJIS.map(emoji => (
              <button
                key={emoji.value}
                onClick={() => setSelectedRating(emoji.value)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all active:scale-95 ${
                  selectedRating === emoji.value
                    ? emoji.color + ' scale-110 shadow-md'
                    : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <span className='text-2xl'>{emoji.icon}</span>
                <span className='text-[9px] font-bold text-slate-500'>{emoji.label}</span>
              </button>
            ))}
          </div>
          {selectedRating && (
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={selectedRating >= 4 ? 'What did you love? (optional)' : 'What can we improve? (optional)'}
              rows={2}
              className='w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-green-400 resize-none mb-4 transition-all'
            />
          )}
          <button
            onClick={handleFeedbackSubmit}
            disabled={!selectedRating || submitting}
            className='w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-3 rounded-xl transition-all active:scale-95'
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
          <button
            onClick={() => setSubmitted(true)}
            className='w-full text-slate-400 text-xs font-bold py-2 mt-1'
          >
            Skip for now
          </button>
        </div>
      )}

      {/* Feedback submitted */}
      {submitted && (
        <div className='w-full max-w-sm bg-green-50 border border-green-100 rounded-3xl p-6 mb-6 text-center'>
          <p className='text-3xl mb-2'>🙏</p>
          <p className='font-black text-green-700'>Thank you for your feedback!</p>
          <p className='text-xs text-green-600 mt-1'>It helps us serve you better</p>
        </div>
      )}

      {/* Action buttons */}
      <div className='flex flex-col gap-3 w-full max-w-sm'>
        <Link
          to='/dashboard/myorders'
          className='w-full bg-slate-900 text-white font-black py-4 rounded-2xl text-center text-sm transition-all active:scale-95 hover:bg-slate-800'
        >
          📍 Track My Order
        </Link>
        <Link
          to='/'
          className='w-full border-2 border-slate-200 text-slate-700 font-black py-4 rounded-2xl text-center text-sm transition-all active:scale-95 hover:bg-slate-50'
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  )
}

export default Success