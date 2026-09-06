import React from 'react'
import toast from 'react-hot-toast'

const COUPON_PILLS = [
  { code: 'SNAPIT50', note: 'Special Deals', icon: '🏡', color: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-300' },
  { code: 'WELCOME', note: '1st Order', icon: '⚡', color: 'bg-amber-50 text-amber-900 border-amber-200 hover:border-amber-300' },
  { code: 'BIRYANIFREE', note: 'Alka & Biryani', icon: '🍗', color: 'bg-orange-50 text-orange-800 border-orange-200 hover:border-orange-300' },
]

const TodayOffersStrip = ({ className = '' }) => {
  const copyCode = (code) => {
    navigator.clipboard?.writeText(code)
    toast.success(`🎟️ Promo Code "${code}" copied! Apply at checkout for instant discount`, { duration: 2500 })
  }

  return (
    <div className={`px-3 sm:px-4 my-2 ${className}`}>
      <div className='bg-white/90 backdrop-blur-sm border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none shadow-2xs'>
        <div className='flex items-center gap-1.5 flex-shrink-0 pr-2 border-r border-slate-200'>
          <span className='text-sm animate-pulse'>🎟️</span>
          <span className='text-[11px] font-black text-slate-800 uppercase tracking-tight whitespace-nowrap'>
            PROMO CODES:
          </span>
        </div>

        {/* Sleek Limited Coupon Pills */}
        <div className='flex items-center gap-2 flex-nowrap'>
          {COUPON_PILLS.map((item, idx) => (
            <button
              key={idx}
              type='button'
              onClick={() => copyCode(item.code)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl border ${item.color} text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all`}
            >
              <span>{item.icon}</span>
              <span className='font-black tracking-wide'>{item.code}</span>
              <span className='text-[10px] text-slate-600 font-semibold'>({item.note})</span>
              <span className='text-[9px] bg-white text-slate-800 border border-slate-200/60 px-1.5 py-0.5 rounded-md font-black shadow-2xs ml-0.5'>
                Copy
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TodayOffersStrip
