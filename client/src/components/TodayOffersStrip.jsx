import React from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const OFFERS = [
  {
    icon: '🎂',
    title: 'Birthday Cake',
    tag: 'UP TO 60% OFF',
    code: 'SNAPIT60',
    sub: 'Fresh Cake Direct Ghar Ke Darwaze Par',
    bg: 'from-amber-500 to-orange-600',
    link: '/category/bakery-cakes-6a1c1d'
  },
  {
    icon: '🍗',
    title: 'Alka Biryani & Food',
    tag: 'UP TO 60% OFF',
    code: 'SNAPIT60',
    sub: 'Garma-Garam Food in 30 Mins',
    bg: 'from-rose-500 to-red-600',
    link: '/food'
  },
  {
    icon: '⚡',
    title: 'First Order Offer',
    tag: 'UP TO 60% OFF',
    code: 'WELCOME60',
    sub: 'Special Welcome Treat',
    bg: 'from-emerald-500 to-teal-600',
    link: '/'
  },
  {
    icon: '🌙',
    title: 'Late Night Snacks',
    tag: 'UP TO 60% OFF',
    code: 'SNAPIT',
    sub: 'Valid Till 9:00 PM',
    bg: 'from-indigo-600 to-purple-700',
    link: '/search?q=chips'
  },
  {
    icon: '⭐',
    title: 'Snapit+ Members',
    tag: '100% FREE DELIVERY',
    code: 'SNAPITPLUS',
    sub: 'No Delivery Fee on ₹149+',
    bg: 'from-slate-800 to-slate-900',
    link: '/snapit-plus'
  },
]

const TodayOffersStrip = () => {
  const navigate = useNavigate()

  const copyCode = (e, code) => {
    e.stopPropagation()
    if (code === 'SNAPITPLUS') {
      navigate('/snapit-plus')
      return
    }
    navigator.clipboard?.writeText(code)
    toast.success(`🎟️ Code "${code}" copied! Apply at checkout for Up to 60% OFF`, { duration: 3500 })
  }

  return (
    <section className='container mx-auto px-4 my-3.5'>
      <div className='flex items-center justify-between mb-2.5'>
        <div className='flex items-center gap-2'>
          <span className='text-lg'>🔥</span>
          <div>
            <h3 className='text-sm font-black text-slate-900 uppercase tracking-wide'>
              Today's Exclusive Offers
            </h3>
            <p className='text-[10px] font-semibold text-emerald-600'>
              Zomato-Style Mega Savings • Up to 60% OFF
            </p>
          </div>
        </div>
        <span className='text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full'>
          Tap code to copy
        </span>
      </div>

      {/* Horizontal Scrollable Offers Carousel (Blinkit style) */}
      <div className='flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory'>
        {OFFERS.map((item, idx) => (
          <div
            key={idx}
            onClick={() => navigate(item.link)}
            className={`flex-shrink-0 w-64 p-3.5 rounded-2xl bg-gradient-to-br ${item.bg} text-white shadow-sm cursor-pointer hover:scale-[1.02] transition-transform snap-start relative overflow-hidden`}
          >
            {/* Background Glow */}
            <div className='absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none' />

            <div className='flex items-start justify-between gap-2 mb-2'>
              <div className='flex items-center gap-2'>
                <span className='text-2xl'>{item.icon}</span>
                <div>
                  <h4 className='text-xs font-black leading-tight'>{item.title}</h4>
                  <p className='text-[10px] text-white/80 line-clamp-1'>{item.sub}</p>
                </div>
              </div>
              <span className='bg-white/20 backdrop-blur-md text-[9px] font-black uppercase px-2 py-0.5 rounded-full whitespace-nowrap'>
                {item.tag}
              </span>
            </div>

            <div className='mt-2 pt-2 border-t border-white/20 flex items-center justify-between'>
              <span className='text-[10px] font-medium text-white/90'>Code:</span>
              <button
                onClick={(e) => copyCode(e, item.code)}
                className='px-2.5 py-1 bg-white text-slate-900 text-[11px] font-black rounded-lg shadow-sm hover:bg-amber-100 transition-colors flex items-center gap-1 active:scale-95'
              >
                <span>{item.code}</span>
                <span className='text-[9px] opacity-70'>📋</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default TodayOffersStrip
