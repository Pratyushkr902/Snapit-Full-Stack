import React, { useState, useEffect } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import { IoMegaphoneOutline, IoSparklesOutline, IoSendOutline, IoTrophyOutline } from 'react-icons/io5'

const AdminMarketingHub = () => {
  const [templates, setTemplates] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [sending, setSending] = useState(false)
  const [lastResult, setLastResult] = useState(null)

  const DEFAULT_BACK_TEMPLATE = {
    category: '🚀 Snapit is Back! (Grand Launch)',
    title: '🚀 We Are Back! Snapit 10-Min Delivery is LIVE! 🎉',
    shayari: '"Aapke intezaar ki ghadi hui khatam aaj,\nSnapit laut aaya hai lekar naya andaaz!" ⚡🛍️',
    body: 'Groceries, fresh milk, dairy, snacks aur resto cravings — ab sab deliver hoga bas 10 minute mein! Tap karke order karo abhi! 🛒✨'
  }

  const [formData, setFormData] = useState({
    title: DEFAULT_BACK_TEMPLATE.title,
    shayari: DEFAULT_BACK_TEMPLATE.shayari,
    body: DEFAULT_BACK_TEMPLATE.body
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true)
      const res = await Axios({
        url: SummaryApi.getMarketingTemplates?.url || '/api/marketing/templates',
        method: SummaryApi.getMarketingTemplates?.method || 'get'
      })
      if (res.data?.success && res.data.data?.length > 0) {
        setTemplates(res.data.data)
      } else {
        setTemplates([DEFAULT_BACK_TEMPLATE])
      }
    } catch (err) {
      setTemplates([DEFAULT_BACK_TEMPLATE])
    } finally {
      setLoadingTemplates(false)
    }
  }

  const handleSelectTemplate = (tpl) => {
    setFormData({
      title: tpl.title,
      shayari: tpl.shayari || '',
      body: tpl.body
    })
    toast.success(`Loaded "${tpl.category || 'Template'}"`)
  }

  const handleBroadcast = async (e) => {
    e?.preventDefault()
    if (!formData.title || !formData.body) {
      toast.error('Title and body are required.')
      return
    }

    const confirmSend = window.confirm(`Are you sure you want to broadcast this push notification to ALL registered Snapit users?`)
    if (!confirmSend) return

    try {
      setSending(true)
      toast.loading('Broadcasting push notification to all users...', { id: 'broadcast' })
      const res = await Axios({
        url: SummaryApi.broadcastMarketingCampaign?.url || '/api/marketing/broadcast',
        method: SummaryApi.broadcastMarketingCampaign?.method || 'post',
        data: formData
      })

      if (res.data?.success) {
        setLastResult(res.data.data)
        toast.success(`🎉 Broadcast Delivered to ${res.data.data?.deliveredCount || 0} active devices!`, { id: 'broadcast', duration: 5000 })
      } else {
        toast.error(res.data?.message || 'Broadcast failed', { id: 'broadcast' })
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message, { id: 'broadcast' })
    } finally {
      setSending(false)
    }
  }

  const handleTriggerSchedule = async (type, name) => {
    try {
      toast.loading(`Executing ${name}...`, { id: 'trigger-cron' })
      const res = await Axios({
        url: SummaryApi.triggerMarketingSchedule?.url || '/api/marketing/trigger-schedule',
        method: SummaryApi.triggerMarketingSchedule?.method || 'post',
        data: { scheduleType: type }
      })

      if (res.data?.success) {
        const count = res.data.data?.deliveredCount ?? res.data.data?.nudgedCount ?? 0
        toast.success(`✅ ${name} executed! Sent to ${count} recipient(s).`, { id: 'trigger-cron', duration: 5000 })
      } else {
        toast.error(res.data?.message || 'Execution failed', { id: 'trigger-cron' })
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message, { id: 'trigger-cron' })
    }
  }

  return (
    <div className='my-2 sm:my-6 bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm overflow-hidden'>
      {/* Header */}
      <div className='flex flex-wrap items-center justify-between gap-4 pb-4 sm:pb-5 border-b border-slate-100'>
        <div>
          <div className='flex items-center gap-2'>
            <span className='p-2 bg-gradient-to-tr from-amber-500 to-orange-500 text-white rounded-xl shadow-sm'>
              <IoMegaphoneOutline size={20} />
            </span>
            <h3 className='font-black text-slate-900 text-base sm:text-lg'>
              Marketing & Notification Hub
            </h3>
            <span className='px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full'>
              Auto Crons Active
            </span>
          </div>
          <p className='text-xs text-slate-500 mt-1'>
            Automated scheduled meal engagement schedules & high-priority push broadcast command center
          </p>
        </div>
      </div>

      {/* ⏰ Automated Cron Schedules Status */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-4 sm:my-5'>
        {/* 1. Breakfast */}
        <div className='p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 flex flex-col justify-between gap-2'>
          <div className='flex items-start gap-2.5'>
            <span className='text-2xl'>🥛</span>
            <div>
              <div className='flex items-center gap-1.5'>
                <p className='font-bold text-xs text-amber-950'>Breakfast Rush</p>
                <span className='text-[10px] bg-amber-200/70 text-amber-900 px-1.5 py-0.2 rounded font-semibold'>08:30 AM</span>
              </div>
              <p className='text-[11px] text-amber-800/90 mt-0.5'>Milk, bread, eggs & tea</p>
            </div>
          </div>
          <button
            type='button'
            onClick={() => handleTriggerSchedule('BREAKFAST', 'Breakfast Rush')}
            className='w-full py-1 text-[11px] font-bold bg-amber-200/80 hover:bg-amber-300 text-amber-950 rounded-lg transition-all active:scale-95'
          >
            ⚡ Test Run Breakfast
          </button>
        </div>

        {/* 2. Chai & Snacks */}
        <div className='p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200/70 flex flex-col justify-between gap-2'>
          <div className='flex items-start gap-2.5'>
            <span className='text-2xl'>☕</span>
            <div>
              <div className='flex items-center gap-1.5'>
                <p className='font-bold text-xs text-orange-950'>Chai & Snacks</p>
                <span className='text-[10px] bg-orange-200/70 text-orange-900 px-1.5 py-0.2 rounded font-semibold'>05:00 PM</span>
              </div>
              <p className='text-[11px] text-orange-800/90 mt-0.5'>Maggi, biscuits & evening</p>
            </div>
          </div>
          <button
            type='button'
            onClick={() => handleTriggerSchedule('CHAI_TIME', 'Chai & Snacks')}
            className='w-full py-1 text-[11px] font-bold bg-orange-200/80 hover:bg-orange-300 text-orange-950 rounded-lg transition-all active:scale-95'
          >
            ⚡ Test Run Chai Time
          </button>
        </div>

        {/* 3. Dinner */}
        <div className='p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/70 flex flex-col justify-between gap-2'>
          <div className='flex items-start gap-2.5'>
            <span className='text-2xl'>🍕</span>
            <div>
              <div className='flex items-center gap-1.5'>
                <p className='font-bold text-xs text-rose-950'>Dinner Feast</p>
                <span className='text-[10px] bg-rose-200/70 text-rose-900 px-1.5 py-0.2 rounded font-semibold'>08:00 PM</span>
              </div>
              <p className='text-[11px] text-rose-800/90 mt-0.5'>Pizza, Biryani & resto food</p>
            </div>
          </div>
          <button
            type='button'
            onClick={() => handleTriggerSchedule('DINNER', 'Dinner Feast')}
            className='w-full py-1 text-[11px] font-bold bg-rose-200/80 hover:bg-rose-300 text-rose-950 rounded-lg transition-all active:scale-95'
          >
            ⚡ Test Run Dinner
          </button>
        </div>

        {/* 4. Cart Nudge */}
        <div className='p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/70 flex flex-col justify-between gap-2'>
          <div className='flex items-start gap-2.5'>
            <span className='text-2xl'>🛒</span>
            <div>
              <div className='flex items-center gap-1.5'>
                <p className='font-bold text-xs text-blue-950'>Cart Recovery</p>
                <span className='text-[10px] bg-blue-200/70 text-blue-900 px-1.5 py-0.2 rounded font-semibold'>Every 10m</span>
              </div>
              <p className='text-[11px] text-blue-800/90 mt-0.5'>Nudges users with left items</p>
            </div>
          </div>
          <button
            type='button'
            onClick={() => handleTriggerSchedule('CART_NUDGE', 'Cart Recovery Sweep')}
            className='w-full py-1 text-[11px] font-bold bg-blue-200/80 hover:bg-blue-300 text-blue-950 rounded-lg transition-all active:scale-95'
          >
            ⚡ Run Cart Nudge Now
          </button>
        </div>
      </div>

      {/* Quick Template Picker */}
      <div className='mt-6'>
        <p className='font-bold text-xs text-slate-700 mb-2 flex items-center gap-1.5'>
          <IoSparklesOutline className='text-amber-500' />
          1-Click Viral Template Presets:
        </p>
        <div className='flex gap-2 overflow-x-auto pb-2 scrollbar-none'>
          {templates.map((t, idx) => (
            <button
              key={idx}
              type='button'
              onClick={() => handleSelectTemplate(t)}
              className='px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 transition-all border border-slate-200/60 whitespace-nowrap active:scale-95'
            >
              {t.category || t.title.slice(0, 20)}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Broadcast Form & Live Mockup */}
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4 pt-4 border-t border-slate-100'>
        {/* Form Inputs (7 Cols) */}
        <div className='lg:col-span-7 flex flex-col gap-3'>
          <div>
            <label className='block text-xs font-bold text-slate-700 mb-1'>Notification Title</label>
            <input
              type='text'
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className='w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-orange-400'
              placeholder='e.g. 🥛 Nashta ready hai? Ya doodh khatam?'
            />
          </div>

          <div>
            <label className='block text-xs font-bold text-slate-700 mb-1'>Hinglish Shayari / Meme Hook</label>
            <textarea
              rows={2}
              value={formData.shayari}
              onChange={e => setFormData({ ...formData, shayari: e.target.value })}
              className='w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-orange-400'
              placeholder='Add a rhyming shayari or funny meme line...'
            />
          </div>

          <div>
            <label className='block text-xs font-bold text-slate-700 mb-1'>Body / Call To Action</label>
            <textarea
              rows={2}
              value={formData.body}
              onChange={e => setFormData({ ...formData, body: e.target.value })}
              className='w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-orange-400'
              placeholder='Action offer text...'
            />
          </div>

          <button
            type='button'
            onClick={handleBroadcast}
            disabled={sending}
            className='mt-2 flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-98 text-white font-black text-sm rounded-xl shadow-lg shadow-orange-500/25 transition-all'
          >
            <IoSendOutline size={18} />
            {sending ? 'Dispatched In Progress...' : '🚀 Broadcast Live Notification to All Users'}
          </button>
        </div>

        {/* Live Phone Mockup Preview (5 Cols) */}
        <div className='lg:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-900 rounded-2xl text-white shadow-inner'>
          <p className='text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-wider'>
            📱 Live Lock Screen Preview
          </p>

          {/* iOS / Android Card Mockup */}
          <div className='w-full bg-slate-800/90 backdrop-blur border border-slate-700 rounded-2xl p-4 shadow-xl'>
            <div className='flex items-center justify-between text-[11px] text-slate-400 mb-1.5'>
              <div className='flex items-center gap-1.5 font-bold text-white'>
                <span className='w-4 h-4 bg-green-500 rounded-md flex items-center justify-center text-[10px]'>⚡</span>
                Snapit
              </div>
              <span>now</span>
            </div>
            <p className='font-bold text-xs text-white leading-tight'>{formData.title}</p>
            {formData.shayari && (
              <p className='text-[11px] text-amber-300 font-medium mt-1 whitespace-pre-line italic leading-tight'>
                {formData.shayari}
              </p>
            )}
            <p className='text-[11px] text-slate-300 mt-1 leading-snug'>
              {formData.body}
            </p>
          </div>

          {lastResult && (
            <div className='mt-3 text-center text-xs text-emerald-400 font-semibold'>
              ✅ Last Broadcast: {lastResult.deliveredCount} devices reached
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminMarketingHub
