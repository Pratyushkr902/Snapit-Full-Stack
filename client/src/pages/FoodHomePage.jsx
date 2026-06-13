import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Axios from '../utils/Axios'

const FoodHomePage = () => {
  const navigate = useNavigate()
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await Axios({ method: 'GET', url: '/api/restaurant/all' })
        if (res.data?.success) setRestaurants(res.data.data)
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const filtered = restaurants.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.cuisineTypes||[]).join(' ').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <section className='bg-gray-50 min-h-screen pb-24'>
      <div className='bg-white sticky top-0 z-10 shadow-sm'>
        <div className='flex items-center gap-3 px-4 py-3'>
          <button onClick={() => navigate('/')} className='p-2 rounded-full bg-gray-100 active:scale-95'>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className='text-lg font-black text-gray-900'>Food Delivery</h1>
            <p className='text-xs text-gray-400'>Paliganj · 20–40 min</p>
          </div>
        </div>
        <div className='px-4 pb-3'>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder='Search restaurants or cuisine...'
            className='w-full px-4 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-800 outline-none focus:ring-2 focus:ring-orange-400'/>
        </div>
      </div>

      <div className='px-4 pt-4'>
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} className='bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse mb-4'>
              <div className='h-40 bg-gray-200'/>
              <div className='p-4 flex flex-col gap-2'>
                <div className='h-4 bg-gray-200 rounded w-1/2'/>
                <div className='h-3 bg-gray-200 rounded w-3/4'/>
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className='flex flex-col items-center justify-center mt-20 gap-3 text-center'>
            <span className='text-5xl'>🍽️</span>
            <p className='font-bold text-gray-600'>No restaurants found</p>
          </div>
        ) : filtered.map(r => (
          <div key={r._id}
            onClick={() => r.isOpen && navigate(`/restaurant/${r._id}`)}
            className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 mb-4 transition active:scale-[0.98] ${r.isOpen ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}>
            <div className='relative h-40 bg-orange-50 overflow-hidden'>
              {r.image
                ? <img src={r.image} alt={r.name} className='w-full h-full object-cover'/>
                : <div className='w-full h-full flex items-center justify-center text-5xl'>🍽️</div>}
              {!r.isOpen && (
                <div className='absolute inset-0 bg-black/50 flex items-center justify-center'>
                  <div className='bg-white rounded-xl px-4 py-2 text-center'>
                    <p className='font-black text-gray-800 text-sm'>Closed</p>
                    <p className='text-xs text-gray-500'>Opens at {r.opensAt||'10:00 AM'}</p>
                  </div>
                </div>
              )}
              {r.isPureVeg && <span className='absolute top-3 right-3 bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded-lg'>🌿 Pure Veg</span>}
            </div>
            <div className='p-4'>
              <div className='flex justify-between items-start mb-1'>
                <h2 className='font-black text-gray-900 text-base'>{r.name}</h2>
                <span className='text-green-600 text-xs font-black bg-green-50 border border-green-200 rounded-lg px-2 py-0.5'>★ {r.rating?.toFixed(1)||'4.0'}</span>
              </div>
              <p className='text-xs text-gray-500 mb-2'>{(r.cuisineTypes||[]).join(' · ')}</p>
              <div className='flex items-center gap-3 text-xs text-gray-500 border-t border-gray-100 pt-2'>
                <span>🕐 {r.deliveryTimeMin}–{r.deliveryTimeMax} min</span>
                <span>·</span>
                <span>{r.deliveryFee===0?'🛵 Free delivery':`🛵 ₹${r.deliveryFee}`}</span>
                {r.minOrderValue>0 && <><span>·</span><span>Min ₹{r.minOrderValue}</span></>}
              </div>
              {r.offers?.length>0 && (
                <div className='mt-2 bg-orange-50 rounded-lg px-2.5 py-1.5'>
                  <p className='text-xs text-orange-600 font-semibold truncate'>🏷️ {r.offers[0]}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default FoodHomePage
