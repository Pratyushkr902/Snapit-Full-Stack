import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { IoChatbubbleEllipses, IoClose, IoArrowBack } from 'react-icons/io5'
import toast from 'react-hot-toast'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'
import SummaryApi from '../common/SummaryApi'

// Canned FAQ topics — each renders a static answer.
// "Talk to a human" breaks out into the leave-a-message form instead.
const FAQ_TOPICS = [
  {
    id: 'order_status',
    label: '📦 Order status',
    answer: "You can track your live order status and rider location from the 'My Orders' page. Tap on any active order to see real-time updates.",
  },
  {
    id: 'delivery_time',
    label: '⏱️ Delivery time',
    answer: 'Most orders are delivered within 30–45 minutes depending on your distance from the store and order volume. You\'ll see an estimated time at checkout and on your order tracking page.',
  },
  {
    id: 'refund_policy',
    label: '💰 Refund policy',
    answer: 'If an item was missing, damaged, or your order was cancelled after payment, refunds are processed to your original payment method or Snapit wallet within 3–5 business days. You can raise a refund request from the order details page.',
  },
  {
    id: 'delivery_fee',
    label: '🚴 Delivery fee & minimum order',
    answer: 'Delivery fee and minimum order amount depend on your distance from the store. You\'ll see the exact fee and any minimum order requirement at checkout before you pay.',
  },
]

const ChatBox = () => {
  const user = useSelector(state => state.user)

  const [open, setOpen] = useState(false)
  const [view, setView] = useState('menu') // 'menu' | 'answer' | 'form' | 'sent'
  const [activeTopic, setActiveTopic] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.mobile || '',
    orderId: '',
    message: '',
  })

  const resetToMenu = () => {
    setView('menu')
    setActiveTopic(null)
  }

  const handleTopicClick = (topic) => {
    setActiveTopic(topic)
    setView('answer')
  }

  const handleFormChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.message.trim()) {
      toast.error('Please type your message before sending.')
      return
    }
    setSubmitting(true)
    try {
      const response = await Axios({
        ...SummaryApi.createSupportMessage,
        data: {
          name: formData.name,
          phone: formData.phone,
          orderId: formData.orderId,
          message: formData.message,
        },
      })
      if (response.data.success) {
        setView('sent')
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setSubmitting(false)
    }
  }

  const closeAndReset = () => {
    setOpen(false)
    setTimeout(resetToMenu, 300) // reset after close animation
  }

  return (
    <>
      {/* Chat window */}
      {open && (
        <div className='fixed z-50 bottom-24 right-4 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden' style={{ maxHeight: '70vh' }}>
          {/* Header */}
          <div className='bg-orange-500 px-4 py-3 flex items-center justify-between shrink-0'>
            <div className='flex items-center gap-2'>
              {view !== 'menu' && (
                <button onClick={resetToMenu} className='text-white/90 hover:text-white'>
                  <IoArrowBack size={18} />
                </button>
              )}
              <p className='font-black text-white text-sm'>Snapit Help</p>
            </div>
            <button onClick={closeAndReset} className='text-white/90 hover:text-white'>
              <IoClose size={20} />
            </button>
          </div>

          {/* Body */}
          <div className='p-4 overflow-y-auto flex-1'>
            {view === 'menu' && (
              <>
                <p className='text-xs text-slate-500 mb-3'>Hi! 👋 What do you need help with?</p>
                <div className='flex flex-col gap-2'>
                  {FAQ_TOPICS.map(topic => (
                    <button
                      key={topic.id}
                      onClick={() => handleTopicClick(topic)}
                      className='text-left text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 transition-colors'
                    >
                      {topic.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setView('form')}
                    className='text-left text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl px-3 py-2.5 transition-colors mt-1'
                  >
                    💬 Talk to a person
                  </button>
                </div>
              </>
            )}

            {view === 'answer' && activeTopic && (
              <div>
                <p className='font-black text-slate-800 text-xs mb-2'>{activeTopic.label}</p>
                <p className='text-xs text-slate-600 leading-relaxed mb-4'>{activeTopic.answer}</p>
                <button
                  onClick={() => setView('form')}
                  className='w-full text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl px-3 py-2.5 transition-colors'
                >
                  Still need help? Message us →
                </button>
              </div>
            )}

            {view === 'form' && (
              <form onSubmit={handleSubmit} className='flex flex-col gap-2.5'>
                <p className='text-xs text-slate-500 mb-1'>Leave a message and we'll reply as soon as we can.</p>
                <input
                  type='text'
                  name='name'
                  placeholder='Your name'
                  value={formData.name}
                  onChange={handleFormChange}
                  className='text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400'
                />
                <input
                  type='tel'
                  name='phone'
                  placeholder='Phone number (optional)'
                  value={formData.phone}
                  onChange={handleFormChange}
                  className='text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400'
                />
                <input
                  type='text'
                  name='orderId'
                  placeholder='Order ID (if applicable)'
                  value={formData.orderId}
                  onChange={handleFormChange}
                  className='text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400'
                />
                <textarea
                  name='message'
                  placeholder='Type your message...'
                  value={formData.message}
                  onChange={handleFormChange}
                  rows={3}
                  className='text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400 resize-none'
                />
                <button
                  type='submit'
                  disabled={submitting}
                  className='w-full text-xs font-black text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-60 rounded-xl px-3 py-2.5 transition-colors'
                >
                  {submitting ? 'Sending...' : 'Send message'}
                </button>
              </form>
            )}

            {view === 'sent' && (
              <div className='text-center py-6'>
                <p className='text-2xl mb-2'>✅</p>
                <p className='font-black text-slate-800 text-xs mb-1'>Message sent!</p>
                <p className='text-xs text-slate-500'>We'll get back to you as soon as possible.</p>
                <button
                  onClick={resetToMenu}
                  className='mt-4 text-xs font-bold text-orange-600 hover:underline'
                >
                  Back to menu
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating bubble */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className='fixed z-50 bottom-6 right-4 w-14 h-14 bg-orange-500 rounded-full shadow-2xl shadow-orange-200 flex items-center justify-center transition-transform hover:scale-110'
        aria-label='Snapit chat help'
      >
        {open ? <IoClose size={22} className='text-white' /> : <IoChatbubbleEllipses size={24} className='text-white' />}
      </button>
    </>
  )
}

export default ChatBox
