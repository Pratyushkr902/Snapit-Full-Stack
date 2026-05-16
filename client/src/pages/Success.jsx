import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'

const EMOJIS = [
  { icon: '😞', label: 'Poor', value: 1, color: 'border-red-200 bg-red-50 hover:bg-red-100' },
  { icon: '😐', label: 'Okay', value: 2, color: 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100' },
  { icon: '😊', label: 'Good', value: 3, color: 'border-blue-200 bg-blue-50 hover:bg-blue-100' },
  { icon: '😍', label: 'Great', value: 4, color: 'border-green-200 bg-green-50 hover:bg-green-100' },
  { icon: '🤩', label: 'Amazing', value: 5, color: 'border-purple-200 bg-purple-50 hover:bg-purple-100' },
]

const Success = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const isOrder = Boolean(location?.state?.text)

  const [selectedRating, setSelectedRating] = useState(null)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleFeedbackSubmit = async () => {
    if (!selectedRating) {
      toast.error('Please select a rating')
      return
    }
    try {
      setSubmitting(true)
      // Store feedback — you can create a feedback endpoint later
      // For now just show success
      await new Promise(resolve => setTimeout(resolve, 800))
      setSubmitted(true)
      toast.success('Thank you for your feedback! 🙏')
    } catch (error) {
      toast.error('Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-start pt-12 px-4 pb-20'>

      {/* Success Animation */}
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
              ? 'Your groceries are being packed and will arrive in 9 minutes ⚡'
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

      {/* Feedback Card */}
      {isOrder && !submitted && (
        <div className='w-full max-w-sm bg-white rounded-3xl shadow-xl border border-slate-100 p-6 mb-6'>
          <div className='text-center mb-5'>
            <p className='font-black text-slate-800 text-base'>How was your experience?</p>
            <p className='text-xs text-slate-400 mt-1'>Your feedback helps us improve</p>
          </div>

          {/* Emoji Rating */}
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

          {/* Comment */}
          {selectedRating && (
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={selectedRating >= 4
                ? 'What did you love? (optional)'
                : 'What can we improve? (optional)'}
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

      {/* Action Buttons */}
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