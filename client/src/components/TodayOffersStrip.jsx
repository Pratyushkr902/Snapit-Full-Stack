import React from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const COUPON_PILLS = [
  { code: 'SNAPIT60', label: 'Village & Cakes: Up to 60% OFF', icon: '🏡', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { code: 'WELCOME60', label: '1st Order: Up to 60% OFF', icon: '⚡', color: 'bg-amber-50 text-amber-900 border-amber-200' },
  { code: 'CAKE50', label: 'Birthday Cakes: Up to 60% OFF', icon: '🎂', color: 'bg-rose-50 text-rose-800 border-rose-200' },
  { code: 'BIRYANIFREE', label: 'Alka Food: Up to 60% OFF', icon: '🍗', color: 'bg-orange-50 text-orange-800 border-orange-200' },
  { code: 'SNAPIT', label: 'Snacks & Drinks: Up to 60% OFF', icon: '🥤', color: 'bg-blue-50 text-blue-800 border-blue-200' },
]

const TodayOffersStrip = () => {
  const navigate = useNavigate()

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code)
    toast.success(`🎟️ Code "${code}" copied! Apply at checkout for Up to 60% OFF`, { duration: 3000 })
  }

  return (
    <section className='container mx-auto px-3 sm:px-4 my-2.5'>
      <div className='bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2 overflow-x-auto scrollbar-none'>
        <div className='flex items-center gap-1.5 flex-shrink-0 pr-2 border-r border-slate-200'>
          <span className='text-base animate-pulse'>🎟️</span>
          <span className='text-xs font-black text-slate-800 uppercase tracking-tight whitespace-nowrap'>
            Promo Codes:
          </span>
        </div>

        {/* Sleek Horizontal Scrollable Coupon Pills */}
        <div className='flex items-center gap-2 flex-nowrap'>
          {COUPON_PILLS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => copyCode(item.code)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl border ${item.color} text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:scale-105 active:scale-95 transition-all`}
            >
              <span>{item.icon}</span>
              <span className='font-black tracking-wide'>{item.code}</span>
              <span className='text-[10px] opacity-75 font-semibold'>({item.label.split(':')[0]})</span>
              <span className='text-[9px] bg-white/80 px-1.5 py-0.5 rounded-md font-black shadow-2xs'>Copy</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

export default TodayOffersStrip
