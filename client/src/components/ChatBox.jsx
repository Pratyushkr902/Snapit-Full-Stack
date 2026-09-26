import { useState, useRef, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  IoChatbubbleEllipses,
  IoClose,
  IoSend,
  IoCall,
  IoLogoWhatsapp,
  IoRefreshOutline,
  IoCheckmarkCircle,
  IoNavigateCircle,
  IoWalletOutline,
  IoAlertCircleOutline
} from 'react-icons/io5'
import { RiRobot2Line, RiCustomerService2Fill } from 'react-icons/ri'
import Axios, { baseURL } from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { haptic } from '../utils/haptics'
import { io } from 'socket.io-client'

const SUPPORT_PHONE = '+919472026580'
const SUPPORT_WHATSAPP = '919472026580'

// Synthesize pleasant incoming chime for user
const playUserChime = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, ctx.currentTime) // A4
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15) // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.3)
  } catch {}
}

const QUICK_ACTIONS = [
  { id: 'track_order', label: '📦 Track My Order', query: 'track my order' },
  { id: 'refund_wallet', label: '💸 Refund & Wallet', query: 'refund status' },
  { id: 'cancel_order', label: '❌ Cancel Order', query: 'cancel order' },
  { id: 'item_issue', label: '🥑 Missing / Damaged Item', query: 'item issue' },
  { id: 'rider_delay', label: '🛵 Rider Delay', query: 'delivery delay' },
  { id: 'coupons', label: '🎟️ Coupons & Offers', query: 'offers and coupons' },
  { id: 'live_agent', label: '🧑‍💼 Talk to Live Agent', query: 'talk to an executive' },
]

const getShortOrderId = (id) => String(id || '').slice(-8).toUpperCase()

export default function ChatBox() {
  const user = useSelector(state => state.user)
  const reduxOrders = useSelector(state => state.orders?.order || [])
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [hasUnread, setHasUnread] = useState(true)
  const [latestOrders, setLatestOrders] = useState([])
  const [serverChatId, setServerChatId] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const socketRef = useRef(null)

  // Sync orders from Redux or fetch fallback
  useEffect(() => {
    if (Array.isArray(reduxOrders) && reduxOrders.length > 0) {
      setLatestOrders(reduxOrders)
    } else if (user?._id) {
      Axios({ ...SummaryApi.getOrderItems })
        .then(res => {
          if (res.data?.success && Array.isArray(res.data.data)) {
            setLatestOrders(res.data.data)
          }
        })
        .catch(() => {})
    }
  }, [reduxOrders, user?._id])

  // Setup initial conversation
  const initGreeting = (orderId = null) => {
    const customerName = user?.name ? user.name.split(' ')[0] : 'there'
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    if (orderId) {
      setMessages([
        {
          id: 'welcome_1',
          sender: 'bot',
          text: `Hi ${customerName}! 👋 Welcome to Snapit 24/7 Support.`,
          time: now,
        },
        {
          id: 'welcome_2',
          sender: 'bot',
          text: `I see you are inquiring about Order #${getShortOrderId(orderId)}. Let me check the details for you right away.`,
          time: now,
          cardType: 'order_status',
          cardData: { targetOrderId: orderId },
        },
      ])
    } else {
      setMessages([
        {
          id: 'welcome_1',
          sender: 'bot',
          text: `Hi ${customerName}! 👋 Welcome to Snapit 24/7 Support Assistant.`,
          time: now,
        },
        {
          id: 'welcome_2',
          sender: 'bot',
          text: 'How can I help you today? Choose a quick topic below or type your question:',
          time: now,
          showChips: true,
        },
      ])
    }
  }

  // Global event listener to open chat from anywhere (UserMenu, TrackingPage, Header, etc.)
  useEffect(() => {
    const handleOpenChat = (event) => {
      const detail = event?.detail || {}
      setOpen(true)
      setHasUnread(false)
      haptic.medium()
      initGreeting(detail.orderId || null)
    }

    window.addEventListener('open-snapit-chat', handleOpenChat)
    window.openSnapitChat = (context) => {
      window.dispatchEvent(new CustomEvent('open-snapit-chat', { detail: context }))
    }

    return () => {
      window.removeEventListener('open-snapit-chat', handleOpenChat)
      delete window.openSnapitChat
    }
  }, [user?.name, latestOrders])

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isTyping, open])

  // Sync active support chat thread from server
  useEffect(() => {
    if (!user?._id) return

    Axios({ ...SummaryApi.getMySupportChat })
      .then((res) => {
        if (res.data?.success && res.data.data?._id) {
          const chatDoc = res.data.data
          setServerChatId(chatDoc._id)

          if (Array.isArray(chatDoc.messages) && chatDoc.messages.length > 1) {
            const formatted = chatDoc.messages.map((m) => ({
              id: m._id || `${Date.now()}-${Math.random()}`,
              sender: m.sender,
              senderName: m.senderName,
              text: m.text,
              time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              cardType: m.cardType,
              cardData: m.cardData,
            }))
            setMessages(formatted)
          }
        }
      })
      .catch(() => {})
  }, [user?._id])

  // Real-time socket listener for live support messages
  useEffect(() => {
    if (!serverChatId) return

    const socket = io(baseURL, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.emit('join_support_chat', serverChatId)

    socket.on('new_support_message', (payload) => {
      if (payload?.message) {
        const msg = payload.message
        setMessages((prev) => {
          if (prev.some((m) => String(m.id) === String(msg._id))) return prev
          if (msg.sender === 'admin') {
            playUserChime()
            haptic.success()
            setHasUnread(true)
          }
          return [
            ...prev,
            {
              id: msg._id || Date.now(),
              sender: msg.sender,
              senderName: msg.senderName,
              text: msg.text,
              time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              cardType: msg.cardType,
              cardData: msg.cardData,
            },
          ]
        })
      }
    })

    return () => {
      socket.emit('leave_support_chat', serverChatId)
      socket.disconnect()
    }
  }, [serverChatId])

  // Open / Close toggles
  const handleToggle = () => {
    haptic.light()
    if (!open) {
      if (messages.length === 0) {
        initGreeting()
      }
      setOpen(true)
      setHasUnread(false)
      setTimeout(() => inputRef.current?.focus(), 300)
    } else {
      setOpen(false)
    }
  }

  const handleRestart = () => {
    haptic.light()
    initGreeting()
  }

  // Assistant response generator
  const processQuery = (rawText) => {
    const text = rawText.toLowerCase().trim()
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    setIsTyping(true)

    setTimeout(() => {
      setIsTyping(false)
      haptic.light()

      // 1. TRACK ORDER / WHERE IS MY ORDER
      if (text.includes('track') || text.includes('where') || text.includes('kaha') || text.includes('order status') || text.includes('my order')) {
        const activeOrder = latestOrders.find(o =>
          ['Pending', 'Confirmed', 'Packing', 'Out for Delivery'].includes(o.delivery_status)
        )
        const pastOrder = latestOrders[0]

        if (activeOrder) {
          setMessages(prev => [
            ...prev,
            {
              id: Date.now(),
              sender: 'bot',
              text: `I found your active order! Here are the live details:`,
              time: now,
              cardType: 'order_status',
              cardData: { order: activeOrder },
            }
          ])
        } else if (pastOrder) {
          setMessages(prev => [
            ...prev,
            {
              id: Date.now(),
              sender: 'bot',
              text: `You don't have any active orders right now. Your most recent order #${getShortOrderId(pastOrder.orderId || pastOrder._id)} was ${pastOrder.delivery_status || 'Delivered'}.`,
              time: now,
              cardType: 'past_order',
              cardData: { order: pastOrder },
            }
          ])
        } else {
          setMessages(prev => [
            ...prev,
            {
              id: Date.now(),
              sender: 'bot',
              text: `You have not placed any orders yet. Once you place an order, you can track it live with 10-minute delivery updates here!`,
              time: now,
              showChips: true,
            }
          ])
        }
        return
      }

      // 2. REFUND & WALLET
      if (text.includes('refund') || text.includes('wallet') || text.includes('paisa') || text.includes('money') || text.includes('deduct')) {
        const walletBal = user?.walletBalance || 0
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            sender: 'bot',
            text: `Here is your Snapit Refund & Wallet overview:`,
            time: now,
            cardType: 'wallet_card',
            cardData: { walletBalance: walletBal },
          }
        ])
        return
      }

      // 3. CANCEL ORDER
      if (text.includes('cancel')) {
        const activeOrder = latestOrders.find(o =>
          ['Pending', 'Confirmed', 'Packing', 'Out for Delivery'].includes(o.delivery_status)
        )

        if (activeOrder) {
          const isPending = activeOrder.delivery_status === 'Pending'
          setMessages(prev => [
            ...prev,
            {
              id: Date.now(),
              sender: 'bot',
              text: isPending
                ? `You have an active order #${getShortOrderId(activeOrder.orderId || activeOrder._id)} that is still pending. You can cancel it directly below:`
                : `Order #${getShortOrderId(activeOrder.orderId || activeOrder._id)} is already *${activeOrder.delivery_status}*. To prevent food/grocery wastage, cancellation is locked once dark store packing begins. Would you like to connect with a support executive?`,
              time: now,
              cardType: 'cancel_card',
              cardData: { order: activeOrder, canCancel: isPending },
            }
          ])
        } else {
          setMessages(prev => [
            ...prev,
            {
              id: Date.now(),
              sender: 'bot',
              text: 'You do not have any active orders to cancel. If you were charged for an order that did not go through, funds are automatically refunded to your original payment method.',
              time: now,
              showChips: true,
            }
          ])
        }
        return
      }

      // 4. MISSING OR DAMAGED ITEMS
      if (text.includes('missing') || text.includes('damaged') || text.includes('broken') || text.includes('kharab') || text.includes('item issue') || text.includes('wrong')) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            sender: 'bot',
            text: `We are truly sorry for the inconvenience! We take quality very seriously in Paliganj. Please share details or a photo so we can process an immediate refund or replacement:`,
            time: now,
            cardType: 'damage_card',
            cardData: { order: latestOrders[0] },
          }
        ])
        return
      }

      // 5. RIDER DELAY / LATE
      if (text.includes('delay') || text.includes('late') || text.includes('deri') || text.includes('kab aayega') || text.includes('rider')) {
        const activeOrder = latestOrders.find(o => ['Pending', 'Confirmed', 'Packing', 'Out for Delivery'].includes(o.delivery_status))
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            sender: 'bot',
            text: activeOrder
              ? `Your order #${getShortOrderId(activeOrder.orderId || activeOrder._id)} is currently ${activeOrder.delivery_status}. Our riders navigate Paliganj traffic swiftly. You can track live movement on the map or call our delivery partner:`
              : `All Snapit deliveries typically arrive in 10-15 minutes. Delays can occasionally occur during severe weather or peak rush hours.`,
            time: now,
            cardType: activeOrder ? 'order_status' : null,
            cardData: activeOrder ? { order: activeOrder } : null,
            showChips: !activeOrder,
          }
        ])
        return
      }

      // 6. COUPONS & OFFERS
      if (text.includes('coupon') || text.includes('offer') || text.includes('discount') || text.includes('promo')) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            sender: 'bot',
            text: `🎉 You can check active discounts in 'Today's Deals' or apply eligible promo coupons right at the Checkout page! Also, earn 10 Snapit Coins on every successful friend referral.`,
            time: now,
            cardType: 'offers_card',
          }
        ])
        return
      }

      // 7. TALK TO AGENT / HUMAN / WHATSAPP / CALL
      if (text.includes('agent') || text.includes('human') || text.includes('person') || text.includes('executive') || text.includes('whatsapp') || text.includes('call') || text.includes('contact')) {
        // Fire support message to backend
        Axios({
          ...SummaryApi.createSupportMessage,
          data: {
            name: user?.name || 'Customer',
            phone: user?.mobile || '',
            orderId: latestOrders[0] ? (latestOrders[0].orderId || latestOrders[0]._id) : '',
            message: `[ChatBox Escalation] User requested human agent: "${rawText}"`,
          }
        }).catch(() => {})

        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            sender: 'bot',
            text: `I've notified our Paliganj support desk! You can instantly connect with our executive right now via WhatsApp or Direct Phone:`,
            time: now,
            cardType: 'agent_card',
          }
        ])
        return
      }

      // FALLBACK
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: 'bot',
          text: `I understand you're asking about "${rawText}". Here are the quickest options to assist you:`,
          time: now,
          showChips: true,
          cardType: 'agent_card',
        }
      ])
    }, 650)
  }

  // Handle user sending text message
  const handleSendMessage = (textToSend = inputText) => {
    const trimmed = textToSend.trim()
    if (!trimmed) return

    haptic.light()
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: trimmed,
      time: now,
    }

    setMessages(prev => [...prev, userMsg])
    setInputText('')

    // Sync with backend helpdesk
    if (user?._id) {
      Axios({
        ...SummaryApi.sendUserSupportMessage,
        data: {
          text: trimmed,
          orderId: latestOrders[0] ? (latestOrders[0].orderId || latestOrders[0]._id) : '',
        },
      })
        .then((res) => {
          if (res.data?.chat?._id && !serverChatId) {
            setServerChatId(res.data.chat._id)
          }
        })
        .catch(() => {})
    }

    processQuery(trimmed)
  }

  const handleChipClick = (action) => {
    handleSendMessage(action.label)
  }

  return (
    <>
      {/* ── FLOATING TRIGGER BUTTON (Blinkit / Zepto / Zomato style) ── */}
      {!open && (
        <div
          className='fixed bottom-24 sm:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2 group animate-fade-in'
        >
          {/* Desktop Hover Pill */}
          <div className='hidden sm:flex items-center gap-1.5 bg-slate-900/90 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none'>
            <span>Need Help? Chat with us</span>
            <span className='w-2 h-2 rounded-full bg-emerald-400 animate-ping'></span>
          </div>

          <button
            onClick={handleToggle}
            aria-label='Open Snapit Support Chat'
            className='relative h-12 px-3.5 sm:h-14 sm:w-14 sm:px-0 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all duration-300 active:scale-95 hover:scale-105 ring-4 ring-emerald-500/20'
          >
            <IoChatbubbleEllipses size={24} className='animate-pulse' />
            <span className='text-xs font-black sm:hidden'>Chat</span>

            {/* Live Online Glowing Pulse / Unread indicator */}
            {hasUnread && (
              <span className='absolute -top-1 -right-1 flex h-3.5 w-3.5'>
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75'></span>
                <span className='relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 border-2 border-white'></span>
              </span>
            )}
          </button>
        </div>
      )}

      {/* ── CHAT WINDOW (Mobile Drawer / Desktop Floating Card) ── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className='fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 flex items-end sm:items-stretch justify-center bg-black/50 sm:bg-transparent backdrop-blur-xs sm:backdrop-blur-none transition-all'
        >
          <div
            className='bg-white dark:bg-slate-950 w-full sm:w-[400px] h-[85dvh] sm:h-[600px] rounded-t-[28px] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 transition-all'
            onClick={e => e.stopPropagation()}
          >
            {/* Mobile Grab Bar */}
            <div className='w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2 sm:hidden flex-shrink-0'></div>

            {/* ── HEADER ── */}
            <div className='bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 text-white px-4 py-3.5 flex items-center justify-between shadow-md flex-shrink-0'>
              <div className='flex items-center gap-2.5'>
                <div className='relative w-9 h-9 rounded-full bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center text-white'>
                  <RiRobot2Line size={20} />
                  <span className='absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-300 border-2 border-emerald-700'></span>
                </div>
                <div>
                  <div className='flex items-center gap-1.5'>
                    <h3 className='font-black text-sm tracking-tight'>Snapit Assistant</h3>
                    <span className='bg-emerald-400/30 text-emerald-100 text-[10px] font-black px-1.5 py-0.2 rounded-full border border-emerald-300/40'>
                      24x7
                    </span>
                  </div>
                  <p className='text-[11px] text-emerald-100 flex items-center gap-1'>
                    <span className='w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse'></span>
                    Online • Instant Help
                  </p>
                </div>
              </div>

              {/* Header Actions */}
              <div className='flex items-center gap-1'>
                <a
                  href={`tel:${SUPPORT_PHONE}`}
                  className='p-2 hover:bg-white/15 active:scale-95 rounded-full text-white/90 hover:text-white transition-all'
                  title='Call Support'
                >
                  <IoCall size={18} />
                </a>
                <a
                  href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Hi Snapit Support, I need help with my order')}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='p-2 hover:bg-white/15 active:scale-95 rounded-full text-white/90 hover:text-white transition-all'
                  title='WhatsApp Support'
                >
                  <IoLogoWhatsapp size={19} />
                </a>
                <button
                  onClick={handleRestart}
                  className='p-2 hover:bg-white/15 active:scale-95 rounded-full text-white/90 hover:text-white transition-all'
                  title='Restart Conversation'
                >
                  <IoRefreshOutline size={19} />
                </button>
                <button
                  onClick={handleToggle}
                  className='p-2 hover:bg-white/15 active:scale-95 rounded-full text-white/90 hover:text-white transition-all'
                  title='Close Chat'
                >
                  <IoClose size={22} />
                </button>
              </div>
            </div>

            {/* ── CONVERSATION STREAM ── */}
            <div className='flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50 dark:bg-slate-900/60'>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-xs text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-xs font-medium'
                        : msg.sender === 'admin'
                        ? 'bg-gradient-to-tr from-teal-900 via-teal-800 to-emerald-900 text-white rounded-bl-xs font-medium border border-teal-600/50 shadow-md'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-xs border border-slate-100 dark:border-slate-700/60'
                    }`}
                  >
                    {msg.sender === 'admin' && (
                      <div className='flex items-center gap-1.5 mb-1.5 text-[10px] font-black text-emerald-200 border-b border-white/20 pb-1'>
                        <RiCustomerService2Fill size={13} />
                        <span>Support Executive</span>
                        <span>•</span>
                        <span>{msg.senderName || 'Live Helpdesk'}</span>
                      </div>
                    )}
                    <p className='whitespace-pre-wrap'>{msg.text}</p>

                    {/* DYNAMIC CARD: ORDER STATUS */}
                    {msg.cardType === 'order_status' && (
                      <div className='mt-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 flex flex-col gap-2'>
                        {(() => {
                          const orderObj = msg.cardData?.order || latestOrders.find(o =>
                            String(o._id) === String(msg.cardData?.targetOrderId) || String(o.orderId) === String(msg.cardData?.targetOrderId)
                          ) || latestOrders[0]

                          if (!orderObj) {
                            return <p className='text-[11px] text-slate-500'>Order details currently unavailable.</p>
                          }

                          return (
                            <>
                              <div className='flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5'>
                                <div>
                                  <p className='text-[10px] uppercase font-black tracking-wider text-slate-400'>Order ID</p>
                                  <p className='font-mono font-bold text-slate-800 dark:text-white text-xs'>
                                    #{getShortOrderId(orderObj.orderId || orderObj._id)}
                                  </p>
                                </div>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  orderObj.delivery_status === 'Delivered'
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 animate-pulse'
                                }`}>
                                  {orderObj.delivery_status || 'In Transit'}
                                </span>
                              </div>

                              <div className='flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300'>
                                <span>{orderObj.product_details?.name || 'Items'}</span>
                                <span className='font-black'>{DisplayPriceInRupees(orderObj.totalAmt || 0)}</span>
                              </div>

                              {orderObj.rider_name && (
                                <div className='bg-white dark:bg-slate-800 p-2 rounded-lg flex items-center justify-between'>
                                  <div className='text-[11px]'>
                                    <p className='font-bold text-slate-800 dark:text-white'>🏍️ Rider: {orderObj.rider_name}</p>
                                    <p className='text-[10px] text-slate-500'>Assigned Delivery Partner</p>
                                  </div>
                                  {orderObj.rider_mobile && (
                                    <a
                                      href={`tel:${orderObj.rider_mobile}`}
                                      className='bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 p-1.5 rounded-full border border-emerald-200'
                                    >
                                      <IoCall size={14} />
                                    </a>
                                  )}
                                </div>
                              )}

                              <div className='flex gap-2 pt-1'>
                                <button
                                  onClick={() => {
                                    setOpen(false)
                                    navigate(`/order-tracking/${orderObj._id || orderObj.orderId}`)
                                  }}
                                  className='flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all'
                                >
                                  <IoNavigateCircle size={15} />
                                  <span>Live Map</span>
                                </button>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    )}

                    {/* DYNAMIC CARD: PAST ORDER */}
                    {msg.cardType === 'past_order' && msg.cardData?.order && (
                      <div className='mt-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 flex flex-col gap-2'>
                        <div className='flex justify-between items-center text-[11px]'>
                          <span className='font-bold text-slate-700 dark:text-slate-200'>
                            #{getShortOrderId(msg.cardData.order.orderId || msg.cardData.order._id)}
                          </span>
                          <span className='text-emerald-600 font-bold'>
                            {DisplayPriceInRupees(msg.cardData.order.totalAmt || 0)}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setOpen(false)
                            navigate('/dashboard/myorders')
                          }}
                          className='w-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white font-bold py-1.5 rounded-lg text-xs transition-colors'
                        >
                          View Past Orders →
                        </button>
                      </div>
                    )}

                    {/* DYNAMIC CARD: WALLET */}
                    {msg.cardType === 'wallet_card' && (
                      <div className='mt-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3 flex flex-col gap-2'>
                        <div className='flex items-center gap-2'>
                          <div className='w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-700 dark:text-emerald-300'>
                            <IoWalletOutline size={18} />
                          </div>
                          <div>
                            <p className='text-[10px] text-slate-500 dark:text-slate-400 font-bold'>Snapit Wallet Balance</p>
                            <p className='font-black text-sm text-emerald-700 dark:text-emerald-300'>
                              {DisplayPriceInRupees(msg.cardData?.walletBalance || 0)}
                            </p>
                          </div>
                        </div>
                        <p className='text-[11px] text-slate-600 dark:text-slate-300'>
                          • Wallet refunds reflect <strong>instantly</strong>.<br/>
                          • Bank / UPI reversals take 3–5 working days according to RBI guidelines.
                        </p>
                        <div className='flex gap-2 pt-1'>
                          <button
                            onClick={() => {
                              setOpen(false)
                              navigate('/wallet')
                            }}
                            className='flex-1 bg-emerald-600 text-white font-bold py-1.5 rounded-lg text-xs hover:bg-emerald-700 transition-colors'
                          >
                            Open Wallet
                          </button>
                          <button
                            onClick={() => {
                              setOpen(false)
                              navigate('/dashboard/myorders')
                            }}
                            className='flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold py-1.5 rounded-lg text-xs hover:bg-slate-200 transition-colors'
                          >
                            My Refunds
                          </button>
                        </div>
                      </div>
                    )}

                    {/* DYNAMIC CARD: CANCEL */}
                    {msg.cardType === 'cancel_card' && (
                      <div className='mt-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3 flex flex-col gap-2 text-rose-950 dark:text-rose-200'>
                        <div className='flex items-center gap-2'>
                          <IoAlertCircleOutline size={18} className='text-rose-600 shrink-0' />
                          <p className='text-xs font-bold leading-tight'>Cancellation Policy</p>
                        </div>
                        {msg.cardData?.canCancel ? (
                          <button
                            onClick={() => {
                              setOpen(false)
                              navigate(`/order-tracking/${msg.cardData.order._id || msg.cardData.order.orderId}`)
                            }}
                            className='w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-1.5 rounded-lg text-xs transition-colors'
                          >
                            Cancel Order Now
                          </button>
                        ) : (
                          <a
                            href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(`Hi Snapit Support, I want to cancel my active order #${getShortOrderId(msg.cardData?.order?.orderId || msg.cardData?.order?._id)}`)}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-1.5 rounded-lg text-xs text-center transition-colors'
                          >
                            Request Agent to Cancel
                          </a>
                        )}
                      </div>
                    )}

                    {/* DYNAMIC CARD: DAMAGE / MISSING */}
                    {msg.cardType === 'damage_card' && (
                      <div className='mt-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl p-3 flex flex-col gap-2'>
                        <p className='text-xs text-amber-900 dark:text-amber-200 font-medium'>
                          Share a photo of the received items on WhatsApp for instant compensation:
                        </p>
                        <a
                          href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(`Hi Snapit Support, I received damaged/missing items in Order #${msg.cardData?.order ? getShortOrderId(msg.cardData.order.orderId || msg.cardData.order._id) : 'recent'}. Attaching image proof below:`)}`}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors'
                        >
                          <IoLogoWhatsapp size={16} />
                          <span>Send Photo on WhatsApp</span>
                        </a>
                      </div>
                    )}

                    {/* DYNAMIC CARD: LIVE AGENT */}
                    {msg.cardType === 'agent_card' && (
                      <div className='mt-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col gap-2'>
                        <div className='flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold'>
                          <IoCheckmarkCircle size={16} />
                          <span>Support Request Logged</span>
                        </div>
                        <div className='grid grid-cols-2 gap-2 pt-1'>
                          <a
                            href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(`Hi Snapit Support, I need urgent assistance with my account/order.`)}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors'
                          >
                            <IoLogoWhatsapp size={15} />
                            <span>WhatsApp</span>
                          </a>
                          <a
                            href={`tel:${SUPPORT_PHONE}`}
                            className='bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors'
                          >
                            <IoCall size={15} />
                            <span>Call Desk</span>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className='text-[10px] text-slate-400 mt-1 px-1 font-medium'>{msg.time}</span>
                </div>
              ))}

              {/* Typing dots indicator */}
              {isTyping && (
                <div className='flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3.5 py-2.5 rounded-2xl rounded-bl-xs shadow-xs w-16'>
                  <span className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce'></span>
                  <span className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]'></span>
                  <span className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]'></span>
                </div>
              )}

              {/* Quick action chips */}
              <div className='pt-2'>
                <p className='text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-2 px-1'>
                  Suggested Topics
                </p>
                <div className='flex flex-wrap gap-1.5'>
                  {QUICK_ACTIONS.map(action => (
                    <button
                      key={action.id}
                      onClick={() => handleChipClick(action)}
                      className='bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-full shadow-2xs transition-all active:scale-95'
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>

              <div ref={messagesEndRef} />
            </div>

            {/* ── FOOTER INPUT BAR ── */}
            <div className='p-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] sm:pb-3 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-shrink-0'>
              <input
                ref={inputRef}
                type='text'
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSendMessage()
                }}
                placeholder='Type your question here...'
                className='flex-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-4 py-2 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-500 transition-colors'
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim()}
                className='w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition-all active:scale-95 shrink-0 shadow-xs'
                aria-label='Send message'
              >
                <IoSend size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
