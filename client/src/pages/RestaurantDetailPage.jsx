import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Axios from '../utils/Axios'
import toast from 'react-hot-toast'

const RestaurantDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState({})
  const [selectedSize, setSelectedSize] = useState({})
  const [activeCategory, setActiveCategory] = useState('')
  const [vegOnly, setVegOnly] = useState(false)
  const categoryRefs = useRef({})

  useEffect(() => {
    const load = async () => {
      try {
        const res = await Axios({ method:'GET', url:`/api/restaurant/${id}` })
        if (res.data?.success) {
          setData(res.data.data)
          setActiveCategory(res.data.data.menu?.[0]?.category||'')
        }
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  const getSizeGroup = (item) => {
    return item.customizations?.find(c => c.groupName === 'Size')
  }

  const getSelectedSizeOption = (item) => {
    const sizeGroup = getSizeGroup(item)
    if (!sizeGroup) return null
    const sizeName = selectedSize[item._id] || sizeGroup.options[0]?.name
    return sizeGroup.options.find(o => o.name === sizeName) || sizeGroup.options[0]
  }

  const getItemPrice = (item) => {
    const sizeOption = getSelectedSizeOption(item)
    const base = item.discountedPrice || item.price || 0
    return sizeOption ? base + (sizeOption.extraPrice || 0) : base
  }

  const getCartKey = (item) => {
    const size = selectedSize[item._id] || getSelectedSizeOption(item)?.name || ''
    return size ? `${item._id}_${size}` : item._id
  }

  const addToCart = (item) => {
    const key = getCartKey(item)
    const size = selectedSize[item._id] || getSelectedSizeOption(item)?.name
    setCart(p => ({...p, [key]: (p[key]||0)+1}))
    toast.success(`${item.name}${size ? ` (${size})` : ''} added`, {icon:'🍽️', duration:800})
  }

  const removeFromCart = (item) => {
    const key = getCartKey(item)
    setCart(p => {
      const n = {...p}
      if (n[key] <= 1) delete n[key]
      else n[key]--
      return n
    })
  }

  const allItems = data?.menu?.flatMap(c=>c.items)||[]
  const totalItems = Object.values(cart).reduce((a,b)=>a+b,0)
  const totalPrice = allItems.reduce((acc, item) => {
    const sizeGroup = getSizeGroup(item)
    if (sizeGroup) {
      return acc + sizeGroup.options.reduce((s, opt) => {
        const key = `${item._id}_${opt.name}`
        const qty = cart[key] || 0
        const price = (item.discountedPrice || item.price || 0) + (opt.extraPrice || 0)
        return s + qty * price
      }, 0)
    }
    const qty = cart[item._id] || 0
    return acc + qty * (item.discountedPrice || item.price || 0)
  }, 0)

  const getQtyForItem = (item) => {
    const key = getCartKey(item)
    return cart[key] || 0
  }

  const scrollTo = (cat) => {
    setActiveCategory(cat)
    categoryRefs.current[cat]?.scrollIntoView({behavior:'smooth',block:'start'})
  }

  if (loading) return <div className='flex items-center justify-center min-h-screen'><div className='animate-spin rounded-full h-9 w-9 border-t-2 border-b-2 border-orange-500'/></div>
  if (!data) return <div className='flex flex-col items-center justify-center min-h-screen gap-3'><span className='text-5xl'>😕</span><button onClick={()=>navigate('/food')} className='text-orange-500 font-semibold'>← Back</button></div>

  const { restaurant, menu } = data

  return (
    <section className='bg-gray-50 min-h-screen pb-32'>
      <div className='relative h-52 bg-orange-50 overflow-hidden'>
        {restaurant.image
          ? <img src={restaurant.image} alt={restaurant.name} className='w-full h-full object-cover'/>
          : <div className='w-full h-full flex items-center justify-center text-6xl'>🍽️</div>}
        <div className='absolute inset-0 bg-gradient-to-t from-black/60 to-transparent'/>
        <button onClick={()=>navigate('/food')} className='absolute top-4 left-4 bg-white/90 p-2 rounded-full shadow'>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className='absolute bottom-4 left-4 right-4'>
          <h1 className='text-2xl font-black text-white'>{restaurant.name}</h1>
          <p className='text-sm text-white/80'>{(restaurant.cuisineTypes||[]).join(' · ')}</p>
        </div>
      </div>

      <div className='bg-white px-4 py-3 flex items-center gap-4 text-sm border-b border-gray-100 shadow-sm'>
        <span className='font-bold text-gray-800'>★ {restaurant.rating?.toFixed(1)||'4.0'}</span>
        <span className='text-gray-300'>|</span>
        <span className='text-gray-600'>🕐 {restaurant.deliveryTimeMin}–{restaurant.deliveryTimeMax} min</span>
        <span className='text-gray-300'>|</span>
        <span className='text-gray-600'>{restaurant.deliveryFee===0?'🛵 Free':'🛵 ₹'+restaurant.deliveryFee}</span>
      </div>

      {restaurant.offers?.length>0 && (
        <div className='bg-orange-50 border-b border-orange-100 px-4 py-2 flex gap-3 overflow-x-auto'>
          {restaurant.offers.map((o,i)=><span key={i} className='whitespace-nowrap text-xs text-orange-600 font-semibold bg-white border border-orange-200 rounded-lg px-3 py-1'>🏷️ {o}</span>)}
        </div>
      )}

      <div className='bg-white px-4 py-2 flex items-center justify-end border-b border-gray-100'>
        <div className='flex items-center gap-2'>
          <span className='text-xs text-gray-600'>Veg only</span>
          <button onClick={()=>setVegOnly(v=>!v)} className={`w-10 h-5 rounded-full transition-colors ${vegOnly?'bg-green-500':'bg-gray-300'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow mx-0.5 transition-transform ${vegOnly?'translate-x-5':'translate-x-0'}`}/>
          </button>
        </div>
      </div>

      {menu.length>0 && (
        <div className='bg-white sticky top-0 z-10 px-4 py-2 flex gap-2 overflow-x-auto border-b border-gray-100 shadow-sm'>
          {menu.map(s=>(
            <button key={s.category} onClick={()=>scrollTo(s.category)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all ${activeCategory===s.category?'bg-orange-500 text-white':'bg-gray-100 text-gray-600'}`}>
              {s.category}
            </button>
          ))}
        </div>
      )}

      <div className='px-4 pt-4 flex flex-col gap-6'>
        {menu.map(section => {
          const items = vegOnly ? section.items.filter(i=>i.isVeg) : section.items
          if (!items.length) return null
          return (
            <div key={section.category} ref={el=>categoryRefs.current[section.category]=el}>
              <p className='font-black text-gray-800 text-base mb-3 border-l-4 border-orange-500 pl-3'>{section.category}</p>
              <div className='flex flex-col gap-3'>
                {items.map(item => {
                  const qty = getQtyForItem(item)
                  const price = getItemPrice(item)
                  const hasDisc = item.discountedPrice && item.discountedPrice < item.price
                  const sizeGroup = getSizeGroup(item)
                  const currentSize = selectedSize[item._id] || sizeGroup?.options[0]?.name

                  return (
                    <div key={item._id} className='bg-white rounded-2xl p-4 flex gap-3 shadow-sm border border-gray-100'>
                      <div className='relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-gray-100'>
                        {item.image ? <img src={item.image} alt={item.name} className='w-full h-full object-cover'/> : <div className='w-full h-full flex items-center justify-center text-3xl'>🍽️</div>}
                        {item.isBestseller && <span className='absolute bottom-0 left-0 right-0 bg-orange-500 text-white text-[9px] font-black text-center py-0.5'>BESTSELLER</span>}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-start justify-between gap-2'>
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center gap-1.5 mb-0.5'>
                              <span className={`w-3.5 h-3.5 border-2 rounded-sm flex-shrink-0 ${item.isVeg?'border-green-500':'border-red-500'}`}>
                                <span className={`block w-1.5 h-1.5 rounded-full m-0.5 ${item.isVeg?'bg-green-500':'bg-red-500'}`}/>
                              </span>
                              <p className='font-bold text-gray-900 text-sm truncate'>{item.name}</p>
                            </div>
                            {item.description && <p className='text-xs text-gray-400 line-clamp-2 mb-1'>{item.description}</p>}

                            {sizeGroup && (
                              <div className='flex gap-1.5 mb-1.5'>
                                {sizeGroup.options.map(opt => {
                                  const optPrice = (item.discountedPrice || item.price || 0) + (opt.extraPrice || 0)
                                  const isActive = currentSize === opt.name
                                  return (
                                    <button key={opt.name}
                                      onClick={() => setSelectedSize(p => ({...p, [item._id]: opt.name}))}
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all ${isActive ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-300'}`}>
                                      {opt.name} ₹{optPrice}
                                    </button>
                                  )
                                })}
                              </div>
                            )}

                            <div className='flex items-center gap-2'>
                              <p className='font-black text-gray-900 text-sm'>₹{price}</p>
                              {!sizeGroup && hasDisc && <p className='text-xs text-gray-400 line-through'>₹{item.price}</p>}
                              {!sizeGroup && hasDisc && <span className='text-[10px] font-black text-green-600 bg-green-50 px-1.5 py-0.5 rounded'>{Math.round((1-price/item.price)*100)}% OFF</span>}
                            </div>
                          </div>
                          {qty===0 ? (
                            <button onClick={()=>addToCart(item)} className='flex-shrink-0 border-2 border-orange-500 text-orange-500 font-black text-sm px-4 py-1.5 rounded-xl active:scale-95 transition'>ADD</button>
                          ) : (
                            <div className='flex-shrink-0 flex items-center gap-2 bg-orange-500 rounded-xl px-2 py-1'>
                              <button onClick={()=>removeFromCart(item)} className='text-white font-black text-lg w-6 text-center leading-none'>−</button>
                              <span className='text-white font-black text-sm min-w-[16px] text-center'>{qty}</span>
                              <button onClick={()=>addToCart(item)} className='text-white font-black text-lg w-6 text-center leading-none'>+</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {totalItems>0 && (
        <div className='fixed bottom-4 left-4 right-4 z-50'>
          <button
            onClick={() => navigate('/food-checkout', {
              state: {
                cart,
                allItems,
                restaurantId: id,
                restaurantName: restaurant.name,
                restaurantDeliveryFee: restaurant.deliveryFee || 0,
              }
            })}
            className='w-full bg-orange-500 text-white rounded-2xl px-5 py-4 flex items-center justify-between shadow-xl shadow-orange-500/30 active:scale-[0.98] transition'>
            <span className='bg-orange-600 text-white text-xs font-black px-2 py-1 rounded-lg'>{totalItems} item{totalItems>1?'s':''}</span>
            <span className='font-black text-base'>View Cart</span>
            <span className='font-black text-base'>₹{totalPrice}</span>
          </button>
        </div>
      )}
    </section>
  )
}

export default RestaurantDetailPage