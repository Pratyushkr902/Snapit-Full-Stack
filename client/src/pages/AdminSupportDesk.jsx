import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  IoSearch,
  IoSend,
  IoCall,
  IoLogoWhatsapp,
  IoCheckmarkCircle,
  IoChatbubbleEllipses,
  IoRefreshOutline,
  IoChevronBack,
  IoAlertCircle,
  IoPersonCircleOutline,
  IoTimeOutline
} from 'react-icons/io5'
import { RiRobot2Line, RiCustomerService2Fill } from 'react-icons/ri'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { baseURL } from '../utils/Axios'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import { haptic } from '../utils/haptics'

const QUICK_REPLIES = [
  '👋 Hello! I am looking into your request right now.',
  '🛵 Your rider has picked up the order and is on the way (ETA ~5-7 mins).',
  '📦 We are double-checking your items with the dark store team right now.',
  '💸 We have credited a full refund to your Snapit Wallet. Please check your balance.',
  '🙏 We sincerely apologize for the delay. We are expediting this immediately.',
  '✅ Your issue has been resolved. Please let us know if you need anything else!',
]

// Synthesize pleasant incoming chime via Web Audio API
const playChime = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15) // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
  } catch {}
}

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function AdminSupportDesk() {
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedChatId, setSelectedChatId] = useState(null)
  const [activeChat, setActiveChat] = useState(null)
  const [loadingChat, setLoadingChat] = useState(false)
  const [filterStatus, setFilterStatus] = useState('ALL') // ALL | OPEN | RESOLVED
  const [searchQuery, setSearchQuery] = useState('')
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)

  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)
  const inputRef = useRef(null)

  // Fetch all ticket threads
  const fetchChats = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const res = await Axios({
        ...SummaryApi.getAdminSupportChats,
        params: {
          status: filterStatus === 'ALL' ? undefined : filterStatus,
          search: searchQuery || undefined,
        },
      })
      if (res.data?.success && Array.isArray(res.data.data)) {
        setChats(res.data.data)
        // If nothing selected, auto-select first thread on desktop
        if (!selectedChatId && res.data.data.length > 0 && window.innerWidth >= 768) {
          setSelectedChatId(res.data.data[0]._id)
        }
      }
    } catch (err) {
      console.error('Failed to load support chats', err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  // Fetch active conversation detail
  const fetchActiveChatDetail = async (chatId) => {
    if (!chatId) return
    setLoadingChat(true)
    try {
      const res = await Axios({
        url: `/api/support/admin/chat/${chatId}`,
        method: 'get',
      })
      if (res.data?.success) {
        setActiveChat(res.data.data)
        // Update unread in local list
        setChats((prev) =>
          prev.map((c) => (c._id === chatId ? { ...c, unreadCountAdmin: 0 } : c))
        )
      }
    } catch (err) {
      toast.error('Could not load conversation')
    } finally {
      setLoadingChat(false)
    }
  }

  useEffect(() => {
    fetchChats()
  }, [filterStatus])

  useEffect(() => {
    if (selectedChatId) {
      fetchActiveChatDetail(selectedChatId)
    }
  }, [selectedChatId])

  // Socket.IO real-time subscriptions
  useEffect(() => {
    const socket = io(baseURL, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.emit('join_admin_support')

    socket.on('admin_support_ticket_updated', (updatedData) => {
      playChime()
      haptic.medium()
      setChats((prev) => {
        const idx = prev.findIndex((c) => c._id === updatedData.chatId)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], ...updatedData }
          // Bubble to top
          const [item] = updated.splice(idx, 1)
          return [item, ...updated]
        }
        return [updatedData, ...prev]
      })

      // If this is the active open chat, append or refresh
      if (selectedChatId === updatedData.chatId) {
        fetchActiveChatDetail(updatedData.chatId)
      }
    })

    socket.on('new_support_message', (payload) => {
      if (payload.chatId === selectedChatId) {
        setActiveChat((prev) => {
          if (!prev) return prev
          // Avoid duplicate insertion
          const exists = prev.messages?.some(
            (m) => String(m._id) === String(payload.message?._id)
          )
          if (exists) return prev
          return {
            ...prev,
            messages: [...(prev.messages || []), payload.message],
          }
        })
      }
    })

    return () => {
      socket.emit('leave_admin_support')
      socket.disconnect()
    }
  }, [selectedChatId])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChat?.messages])

  // Send admin reply
  const handleSendReply = async (customText = null) => {
    const textToSend = (customText || replyText).trim()
    if (!textToSend || !selectedChatId || sending) return

    setSending(true)
    haptic.light()
    try {
      const res = await Axios({
        url: `/api/support/admin/chat/${selectedChatId}/message`,
        method: 'post',
        data: { text: textToSend },
      })

      if (res.data?.success) {
        setReplyText('')
        // Locally push message for instant responsiveness
        if (res.data.data) {
          setActiveChat((prev) => ({
            ...prev,
            messages: [...(prev?.messages || []), res.data.data],
            lastMessage: textToSend,
            lastMessageAt: new Date(),
          }))
          setChats((prev) =>
            prev.map((c) =>
              c._id === selectedChatId
                ? { ...c, lastMessage: textToSend, lastMessageAt: new Date(), unreadCountAdmin: 0 }
                : c
            )
          )
        }
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    } catch (err) {
      toast.error('Failed to send reply. Please retry.')
    } finally {
      setSending(false)
    }
  }

  // Toggle ticket status
  const handleStatusToggle = async () => {
    if (!activeChat) return
    const newStatus = activeChat.status === 'RESOLVED' ? 'OPEN' : 'RESOLVED'
    haptic.medium()
    try {
      const res = await Axios({
        url: `/api/support/admin/chat/${activeChat._id}/status`,
        method: 'put',
        data: { status: newStatus },
      })
      if (res.data?.success) {
        toast.success(`Ticket marked as ${newStatus}`)
        setActiveChat((prev) => ({ ...prev, status: newStatus }))
        setChats((prev) =>
          prev.map((c) => (c._id === activeChat._id ? { ...c, status: newStatus } : c))
        )
      }
    } catch (err) {
      toast.error('Could not update status')
    }
  }

  const filteredChats = useMemo(() => {
    return chats.filter((c) => {
      if (filterStatus === 'OPEN' && c.status !== 'OPEN') return false
      if (filterStatus === 'RESOLVED' && c.status !== 'RESOLVED') return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = (c.userName || '').toLowerCase().includes(q)
        const matchMobile = (c.userMobile || '').toLowerCase().includes(q)
        const matchOrder = (c.activeOrderId || '').toLowerCase().includes(q)
        return matchName || matchMobile || matchOrder
      }
      return true
    })
  }, [chats, filterStatus, searchQuery])

  const totalUnreadCount = useMemo(() => {
    return chats.reduce((acc, c) => acc + (c.unreadCountAdmin || 0), 0)
  }, [chats])

  return (
    <div className='min-h-[calc(100vh-80px)] bg-slate-100 dark:bg-slate-950 p-2 sm:p-4'>
      <div className='max-w-7xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden flex flex-col h-[calc(100vh-100px)]'>
        {/* ── TOP APP BAR ── */}
        <div className='bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 text-white px-5 py-3.5 flex items-center justify-between flex-shrink-0'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white'>
              <RiCustomerService2Fill size={22} />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <h1 className='text-base font-black tracking-tight'>Snapit Live Support Desk</h1>
                <span className='bg-emerald-400/20 text-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300/30'>
                  24/7 Operations
                </span>
              </div>
              <p className='text-xs text-emerald-100/90 font-medium'>
                Real-time two-way customer communication & incident resolution
              </p>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <button
              onClick={() => fetchChats(true)}
              className='p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95'
              title='Refresh'
            >
              <IoRefreshOutline size={18} />
            </button>
            {totalUnreadCount > 0 && (
              <span className='bg-rose-500 text-white text-xs font-black px-2.5 py-1 rounded-full animate-pulse shadow-sm'>
                {totalUnreadCount} Unread
              </span>
            )}
          </div>
        </div>

        {/* ── MAIN WORKSPACE (2-COLUMN) ── */}
        <div className='flex-1 flex overflow-hidden'>
          {/* ──── LEFT PANEL: TICKET LIST ──── */}
          <div
            className={`w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/70 dark:bg-slate-900/50 ${
              selectedChatId && 'hidden md:flex'
            }`}
          >
            {/* Search & Filter Header */}
            <div className='p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5 bg-white dark:bg-slate-900'>
              <div className='relative'>
                <IoSearch className='absolute left-3 top-2.5 text-slate-400' size={16} />
                <input
                  type='text'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='Search customer, phone, order #...'
                  className='w-full pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500'
                />
              </div>

              {/* Status pills */}
              <div className='flex items-center gap-1.5'>
                {['ALL', 'OPEN', 'RESOLVED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`flex-1 py-1 text-[11px] font-black rounded-lg transition-all ${
                      filterStatus === st
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st === 'OPEN' ? '🟢 Open' : '✓ Resolved'}
                  </button>
                ))}
              </div>
            </div>

            {/* Ticket List Stream */}
            <div className='flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60'>
              {loading ? (
                <div className='p-8 text-center text-xs text-slate-400'>Loading conversations...</div>
              ) : filteredChats.length === 0 ? (
                <div className='p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2'>
                  <IoChatbubbleEllipses size={28} className='text-slate-300 dark:text-slate-700' />
                  <span>No customer conversations found.</span>
                </div>
              ) : (
                filteredChats.map((c) => {
                  const isSelected = selectedChatId === c._id
                  const hasUnread = (c.unreadCountAdmin || 0) > 0

                  return (
                    <div
                      key={c._id}
                      onClick={() => setSelectedChatId(c._id)}
                      className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-600'
                          : ''
                      }`}
                    >
                      <div className='relative shrink-0'>
                        <div className='w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 text-slate-700 dark:text-slate-200 font-black text-sm flex items-center justify-center shadow-xs'>
                          {(c.userName || 'C')[0]?.toUpperCase()}
                        </div>
                        {c.status === 'OPEN' && (
                          <span className='absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900'></span>
                        )}
                      </div>

                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center justify-between gap-1 mb-0.5'>
                          <h4
                            className={`text-xs truncate ${
                              hasUnread
                                ? 'font-black text-slate-900 dark:text-white'
                                : 'font-bold text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {c.userName || 'Customer'}
                          </h4>
                          <span className='text-[10px] text-slate-400 shrink-0 font-medium'>
                            {formatTimeAgo(c.lastMessageAt)}
                          </span>
                        </div>

                        <p className='text-[11px] text-slate-400 truncate mb-1'>
                          {c.userMobile ? `+91 ${String(c.userMobile).slice(-10)}` : 'Customer'}
                          {c.activeOrderId && ` • #${c.activeOrderId.slice(-6).toUpperCase()}`}
                        </p>

                        <div className='flex items-center justify-between gap-2'>
                          <p
                            className={`text-xs truncate ${
                              hasUnread
                                ? 'font-black text-emerald-700 dark:text-emerald-400'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {c.lastMessage || 'Conversation started'}
                          </p>
                          {hasUnread && (
                            <span className='bg-emerald-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0 shadow-2xs'>
                              {c.unreadCountAdmin}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* ──── RIGHT PANEL: CHAT THREAD & ACTION DESK ──── */}
          <div
            className={`flex-1 flex flex-col bg-white dark:bg-slate-950 ${
              !selectedChatId ? 'hidden md:flex items-center justify-center' : ''
            }`}
          >
            {!selectedChatId ? (
              <div className='text-center p-8 text-slate-400 flex flex-col items-center gap-3'>
                <div className='w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400'>
                  <RiCustomerService2Fill size={36} />
                </div>
                <h3 className='font-bold text-sm text-slate-700 dark:text-slate-200'>
                  Select a Conversation
                </h3>
                <p className='text-xs max-w-xs'>
                  Choose any customer ticket from the left panel to read the full conversation and reply in real-time.
                </p>
              </div>
            ) : (
              <>
                {/* ── CHAT TOP BAR ── */}
                <div className='p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 flex-shrink-0'>
                  <div className='flex items-center gap-3'>
                    <button
                      onClick={() => setSelectedChatId(null)}
                      className='md:hidden p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    >
                      <IoChevronBack size={18} />
                    </button>

                    <div className='w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black text-sm flex items-center justify-center'>
                      {(activeChat?.userName || 'C')[0]?.toUpperCase()}
                    </div>

                    <div>
                      <div className='flex items-center gap-2'>
                        <h2 className='text-sm font-black text-slate-900 dark:text-white'>
                          {activeChat?.userName || 'Customer'}
                        </h2>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            activeChat?.status === 'OPEN'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {activeChat?.status === 'OPEN' ? '🟢 Active Open' : '✓ Resolved'}
                        </span>
                      </div>
                      <p className='text-xs text-slate-400'>
                        {activeChat?.userMobile ? `+91 ${activeChat.userMobile}` : activeChat?.userEmail || ''}
                        {activeChat?.activeOrderId && ` • Order #${activeChat.activeOrderId}`}
                      </p>
                    </div>
                  </div>

                  {/* Top Actions: Call, WhatsApp, Resolve */}
                  <div className='flex items-center gap-1.5'>
                    {activeChat?.userMobile && (
                      <>
                        <a
                          href={`tel:${activeChat.userMobile}`}
                          className='p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-emerald-600 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all'
                          title='Call Customer'
                        >
                          <IoCall size={16} />
                        </a>
                        <a
                          href={`https://wa.me/91${String(activeChat.userMobile).slice(-10)}`}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs transition-all'
                          title='Chat on WhatsApp'
                        >
                          <IoLogoWhatsapp size={16} />
                        </a>
                      </>
                    )}

                    <button
                      onClick={handleStatusToggle}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all active:scale-95 flex items-center gap-1 ${
                        activeChat?.status === 'RESOLVED'
                          ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                      }`}
                    >
                      <IoCheckmarkCircle size={15} />
                      <span>{activeChat?.status === 'RESOLVED' ? 'Reopen' : 'Mark Resolved'}</span>
                    </button>
                  </div>
                </div>

                {/* ── MESSAGES CONTAINER ── */}
                <div className='flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/40 dark:bg-slate-950/40'>
                  {loadingChat ? (
                    <div className='p-8 text-center text-xs text-slate-400'>Loading message history...</div>
                  ) : activeChat?.messages?.length === 0 ? (
                    <div className='p-8 text-center text-xs text-slate-400'>No messages yet in this ticket.</div>
                  ) : (
                    activeChat?.messages?.map((msg, index) => {
                      const isUser = msg.sender === 'user'
                      const isBot = msg.sender === 'bot'
                      const isAdmin = msg.sender === 'admin'

                      return (
                        <div
                          key={msg._id || index}
                          className={`flex flex-col ${
                            isAdmin ? 'items-end' : 'items-start'
                          }`}
                        >
                          {/* Sender label */}
                          <span className='text-[10px] text-slate-400 mb-1 px-1 font-semibold flex items-center gap-1'>
                            {isAdmin && <span>🧑‍💼 Support Team</span>}
                            {isBot && (
                              <span className='flex items-center gap-0.5 text-emerald-600'>
                                <RiRobot2Line size={12} /> Snapit Bot
                              </span>
                            )}
                            {isUser && <span>👤 {activeChat?.userName || 'Customer'}</span>}
                            <span>•</span>
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </span>

                          {/* Message Bubble */}
                          <div
                            className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs ${
                              isAdmin
                                ? 'bg-emerald-600 text-white rounded-tr-xs'
                                : isBot
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-xs'
                                : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-xs'
                            }`}
                          >
                            <p className='whitespace-pre-wrap font-medium'>{msg.text}</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* ── QUICK TEMPLATES ── */}
                <div className='p-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex-shrink-0'>
                  <div className='flex gap-1.5 overflow-x-auto pb-1 scrollbarCustom'>
                    {QUICK_REPLIES.map((reply, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendReply(reply)}
                        className='bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:text-emerald-700 border border-slate-200 dark:border-slate-700 text-[11px] font-medium px-3 py-1 rounded-full whitespace-nowrap transition-all active:scale-95 shadow-2xs'
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── INPUT BAR ── */}
                <div className='p-3 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 flex-shrink-0'>
                  <input
                    ref={inputRef}
                    type='text'
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendReply()
                    }}
                    placeholder={`Reply to ${activeChat?.userName || 'customer'}...`}
                    className='flex-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500'
                  />

                  <button
                    onClick={() => handleSendReply()}
                    disabled={!replyText.trim() || sending}
                    className='h-9 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs'
                  >
                    <span>Send</span>
                    <IoSend size={13} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
