import React, { useEffect, useState } from 'react'
import Axios from '../utils/Axios'
import toast from 'react-hot-toast'

const EMPTY_RESTO = { name:'', description:'', image:'', cuisineTypes:'', deliveryTimeMin:20, deliveryTimeMax:40, deliveryFee:0, minOrderValue:0, isPureVeg:false, isOpen:true, offers:'' }
const EMPTY_ITEM  = { name:'', description:'', image:'', price:'', discountedPrice:'', snapitMargin:0, category:'', isVeg:true, isBestseller:false, isAvailable:true }

export default function RestaurantAdminPage() {
  const [restaurants, setRestaurants] = useState([])
  const [selectedResto, setSelectedResto] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [tab, setTab] = useState('restaurants')
  const [restoForm, setRestoForm] = useState(EMPTY_RESTO)
  const [itemForm, setItemForm] = useState(EMPTY_ITEM)
  const [editingItem, setEditingItem] = useState(null)
  const [editingResto, setEditingResto] = useState(null)
  const [saving, setSaving] = useState(false)

  const loadRestaurants = async () => {
    try {
      const res = await Axios({ method:'GET', url:'/api/restaurant/all' })
      if (res.data?.success) setRestaurants(res.data.data)
    } catch(e) { toast.error('Failed to load restaurants') }
  }

  const loadMenu = async (restoId) => {
    try {
      const res = await Axios({ method:'GET', url:`/api/restaurant/${restoId}/menu` })
      if (res.data?.success) setMenuItems(res.data.data)
    } catch(e) { toast.error('Failed to load menu') }
  }

  useEffect(() => { loadRestaurants() }, [])

  const selectResto = (r) => {
    setSelectedResto(r)
    loadMenu(r._id)
    setTab('menu')
  }

  const handleSaveResto = async () => {
    setSaving(true)
    try {
      const body = {
        ...restoForm,
        cuisineTypes: restoForm.cuisineTypes.split(',').map(s=>s.trim()).filter(Boolean),
        offers: restoForm.offers.split('\n').map(s=>s.trim()).filter(Boolean),
      }
      if (editingResto) {
        await Axios({ method:'PATCH', url:`/api/restaurant/update/${editingResto._id}`, data: body })
        toast.success('Restaurant updated!')
      } else {
        await Axios({ method:'POST', url:'/api/restaurant/create', data: body })
        toast.success('Restaurant created!')
      }
      setRestoForm(EMPTY_RESTO)
      setEditingResto(null)
      loadRestaurants()
      setTab('restaurants')
    } catch(e) { toast.error(e.response?.data?.message || 'Error saving') }
    finally { setSaving(false) }
  }

  const handleToggleOpen = async (r) => {
    try {
      await Axios({ method:'PATCH', url:`/api/restaurant/update/${r._id}`, data:{ isOpen: !r.isOpen } })
      toast.success(r.isOpen ? 'Restaurant closed' : 'Restaurant opened')
      loadRestaurants()
      if (selectedResto?._id === r._id) setSelectedResto(prev => ({...prev, isOpen: !prev.isOpen}))
    } catch(e) { toast.error('Failed to update') }
  }

  const handleSaveItem = async () => {
    if (!selectedResto) return toast.error('Select a restaurant first')
    setSaving(true)
    try {
      const body = { ...itemForm, price: Number(itemForm.price), discountedPrice: Number(itemForm.discountedPrice)||0, snapitMargin: Number(itemForm.snapitMargin)||0 }
      if (editingItem) {
        await Axios({ method:'PUT', url:`/api/restaurant/menu/${editingItem._id}`, data: body })
        toast.success('Item updated!')
      } else {
        await Axios({ method:'POST', url:`/api/restaurant/${selectedResto._id}/menu`, data: body })
        toast.success('Item added!')
      }
      setItemForm(EMPTY_ITEM)
      setEditingItem(null)
      loadMenu(selectedResto._id)
      setTab('menu')
    } catch(e) { toast.error(e.response?.data?.message || 'Error saving') }
    finally { setSaving(false) }
  }

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Delete this item?')) return
    try {
      await Axios({ method:'DELETE', url:`/api/restaurant/menu/${itemId}` })
      toast.success('Item deleted')
      loadMenu(selectedResto._id)
    } catch(e) { toast.error('Failed to delete') }
  }

  const handleToggleItemAvail = async (item) => {
    try {
      await Axios({ method:'PUT', url:`/api/restaurant/menu/${item._id}`, data:{ isAvailable: !item.isAvailable } })
      toast.success(item.isAvailable ? 'Item hidden' : 'Item visible')
      loadMenu(selectedResto._id)
    } catch(e) { toast.error('Failed to update') }
  }

  const startEditItem = (item) => {
    setEditingItem(item)
    setItemForm({
      name: item.name, description: item.description||'', image: item.image||'',
      price: item.price, discountedPrice: item.discountedPrice||0,
      snapitMargin: item.snapitMargin||0, category: item.category,
      isVeg: item.isVeg, isBestseller: item.isBestseller||false, isAvailable: item.isAvailable
    })
    setTab('addItem')
  }

  const startEditResto = (r) => {
    setEditingResto(r)
    setRestoForm({
      name: r.name, description: r.description||'', image: r.image||'',
      cuisineTypes: (r.cuisineTypes||[]).join(', '),
      deliveryTimeMin: r.deliveryTimeMin||20, deliveryTimeMax: r.deliveryTimeMax||40,
      deliveryFee: r.deliveryFee||0, minOrderValue: r.minOrderValue||0,
      isPureVeg: r.isPureVeg||false, isOpen: r.isOpen, offers: (r.offers||[]).join('\n')
    })
    setTab('addResto')
  }

  const inp = 'w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-500 placeholder-slate-500'
  const label = 'text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1'

  return (
    <div className='min-h-screen bg-slate-950 text-white'>
      {/* Header */}
      <div className='bg-slate-900 border-b border-slate-800 px-4 py-4'>
        <h1 className='text-lg font-black text-white'>🍔 Restaurant Admin</h1>
        <p className='text-xs text-slate-500'>Manage restaurants, menus & pricing</p>
      </div>

      {/* Tab bar — FIX 1: added flex-shrink-0 to each button so they never squish/disappear */}
      <div className='bg-slate-900 border-b border-slate-800 flex overflow-x-auto scrollbar-none'>
        {[
          { key:'restaurants', label:'🏪 All Restaurants' },
          ...(selectedResto ? [{ key:'menu', label:`📋 ${selectedResto.name}` }] : []),
          { key:'addResto', label: editingResto ? '✏️ Edit Resto' : '➕ Add Resto' },
          ...(selectedResto ? [{ key:'addItem', label: editingItem ? '✏️ Edit Item' : '➕ Add Item' }] : []),
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-shrink-0 px-4 py-3 text-xs font-black whitespace-nowrap border-b-2 transition-all ${tab===t.key ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className='p-4'>

        {/* ── RESTAURANTS LIST ── */}
        {tab === 'restaurants' && (
          <div className='flex flex-col gap-3'>
            {restaurants.length === 0 && <p className='text-slate-500 text-sm text-center py-10'>No restaurants yet. Add one →</p>}
            {restaurants.map(r => (
              <div key={r._id} className='bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden'>
                <div className='flex gap-3 p-4'>
                  <div className='w-16 h-16 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0'>
                    {r.image ? <img src={r.image} alt={r.name} className='w-full h-full object-cover'/> : <div className='w-full h-full flex items-center justify-center text-2xl'>🍽️</div>}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 mb-0.5'>
                      <p className='font-black text-white truncate'>{r.name}</p>
                      <span className={`flex-shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full ${r.isOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{r.isOpen ? 'OPEN' : 'CLOSED'}</span>
                    </div>
                    <p className='text-xs text-slate-500 truncate'>{(r.cuisineTypes||[]).join(' · ')}</p>
                    <p className='text-xs text-slate-600'>★ {r.rating} · {r.deliveryTimeMin}–{r.deliveryTimeMax} min · ₹{r.deliveryFee} delivery</p>
                  </div>
                </div>
                <div className='flex border-t border-slate-800'>
                  <button onClick={() => selectResto(r)} className='flex-1 py-2.5 text-xs font-black text-orange-400 hover:bg-slate-800 transition'>📋 Menu</button>
                  <button onClick={() => startEditResto(r)} className='flex-1 py-2.5 text-xs font-black text-sky-400 hover:bg-slate-800 transition border-l border-slate-800'>✏️ Edit</button>
                  <button onClick={() => handleToggleOpen(r)} className='flex-1 py-2.5 text-xs font-black hover:bg-slate-800 transition border-l border-slate-800 text-slate-400'>{r.isOpen ? '🔴 Close' : '🟢 Open'}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── MENU LIST ── */}
        {tab === 'menu' && selectedResto && (
          <div>
            <div className='flex justify-between items-center mb-4'>
              <p className='text-sm font-black text-white'>{selectedResto.name} · {menuItems.length} items</p>
              <button onClick={() => { setEditingItem(null); setItemForm(EMPTY_ITEM); setTab('addItem') }}
                className='bg-orange-500 text-white text-xs font-black px-3 py-2 rounded-xl'>+ Add Item</button>
            </div>
            {menuItems.length === 0 && <p className='text-slate-500 text-sm text-center py-10'>No menu items yet.</p>}
            {Object.entries(menuItems.reduce((acc, item) => {
              acc[item.category] = acc[item.category] || []
              acc[item.category].push(item)
              return acc
            }, {})).map(([cat, items]) => (
              <div key={cat} className='mb-5'>
                <p className='text-xs font-black text-slate-400 uppercase tracking-widest mb-2 border-l-2 border-orange-500 pl-2'>{cat}</p>
                <div className='flex flex-col gap-2'>
                  {items.map(item => (
                    <div key={item._id} className={`bg-slate-900 border rounded-xl p-3 ${item.isAvailable ? 'border-slate-800' : 'border-slate-700 opacity-50'}`}>
                      <div className='flex gap-3'>
                        <div className='w-14 h-14 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0'>
                          {item.image ? <img src={item.image} alt={item.name} className='w-full h-full object-cover'/> : <div className='w-full h-full flex items-center justify-center text-xl'>🍽️</div>}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-start justify-between gap-2'>
                            <div className='min-w-0'>
                              <div className='flex items-center gap-1.5 flex-wrap'>
                                <span className={`w-3 h-3 border-2 rounded-sm flex-shrink-0 ${item.isVeg ? 'border-green-500' : 'border-red-500'}`}><span className={`block w-1 h-1 rounded-full m-0.5 ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`}/></span>
                                <p className='font-bold text-white text-sm truncate'>{item.name}</p>
                                {item.isBestseller && <span className='text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-black flex-shrink-0'>BS</span>}
                              </div>
                              <div className='flex items-center gap-2 mt-0.5 flex-wrap'>
                                <p className='text-sm font-black text-white'>₹{item.discountedPrice || item.price}</p>
                                {item.discountedPrice && item.discountedPrice < item.price && <p className='text-xs text-slate-500 line-through'>₹{item.price}</p>}
                                {item.snapitMargin > 0 && <span className='text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-black'>+₹{item.snapitMargin} margin</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* FIX 2: action buttons moved below image+title row so they don't squeeze on narrow screens */}
                      <div className='flex gap-1.5 mt-2 justify-end'>
                        <button onClick={() => startEditItem(item)} className='bg-sky-500/20 text-sky-400 text-[10px] font-black px-2 py-1 rounded-lg'>Edit</button>
                        <button onClick={() => handleToggleItemAvail(item)} className='bg-slate-800 text-slate-400 text-[10px] font-black px-2 py-1 rounded-lg'>{item.isAvailable ? 'Hide' : 'Show'}</button>
                        <button onClick={() => handleDeleteItem(item._id)} className='bg-red-500/20 text-red-400 text-[10px] font-black px-2 py-1 rounded-lg'>Del</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ADD / EDIT RESTAURANT ── */}
        {tab === 'addResto' && (
          <div className='flex flex-col gap-4 w-full max-w-lg'>
            <p className='font-black text-white text-base'>{editingResto ? '✏️ Edit Restaurant' : '➕ New Restaurant'}</p>
            {[
              { key:'name', label:'Restaurant Name *', ph:'e.g. Dom Biryani' },
              { key:'description', label:'Description', ph:'Short tagline' },
              { key:'image', label:'Cover Image URL', ph:'https://...' },
              { key:'cuisineTypes', label:'Cuisine Types (comma separated)', ph:'e.g. Biryani, North Indian' },
              { key:'offers', label:'Offers (one per line)', ph:'50% OFF up to ₹100\nFree delivery above ₹199' },
            ].map(f => (
              <div key={f.key}>
                <p className={label}>{f.label}</p>
                {f.key === 'offers'
                  ? <textarea value={restoForm[f.key]} onChange={e=>setRestoForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.ph} rows={3} className={inp}/>
                  : <input value={restoForm[f.key]} onChange={e=>setRestoForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.ph} className={inp}/>
                }
              </div>
            ))}
            {/* FIX 3: 2-col grid instead of trying to cram 4 fields — works fine on all screen sizes */}
            <div className='grid grid-cols-2 gap-3'>
              {[
                { key:'deliveryTimeMin', label:'Min Delivery (min)' },
                { key:'deliveryTimeMax', label:'Max Delivery (min)' },
                { key:'deliveryFee', label:'Delivery Fee ₹' },
                { key:'minOrderValue', label:'Min Order ₹' },
              ].map(f => (
                <div key={f.key}>
                  <p className={label}>{f.label}</p>
                  <input type='number' value={restoForm[f.key]} onChange={e=>setRestoForm(p=>({...p,[f.key]:e.target.value}))} className={inp}/>
                </div>
              ))}
            </div>
            <div className='flex gap-4 flex-wrap'>
              {[{key:'isPureVeg',label:'Pure Veg'},{key:'isOpen',label:'Open Now'}].map(f=>(
                <label key={f.key} className='flex items-center gap-2 cursor-pointer'>
                  <input type='checkbox' checked={restoForm[f.key]} onChange={e=>setRestoForm(p=>({...p,[f.key]:e.target.checked}))} className='w-4 h-4 accent-orange-500'/>
                  <span className='text-sm text-slate-300'>{f.label}</span>
                </label>
              ))}
            </div>
            <div className='flex gap-3'>
              <button onClick={handleSaveResto} disabled={saving || !restoForm.name}
                className='flex-1 bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black py-3 rounded-xl transition'>
                {saving ? 'Saving...' : editingResto ? '✓ Update Restaurant' : '✓ Create Restaurant'}
              </button>
              <button onClick={() => { setRestoForm(EMPTY_RESTO); setEditingResto(null); setTab('restaurants') }}
                className='px-5 bg-slate-800 text-slate-400 font-black py-3 rounded-xl'>Cancel</button>
            </div>
          </div>
        )}

        {/* ── ADD / EDIT MENU ITEM ── */}
        {tab === 'addItem' && selectedResto && (
          <div className='flex flex-col gap-4 w-full max-w-lg'>
            <p className='font-black text-white text-base'>{editingItem ? '✏️ Edit Item' : '➕ Add Menu Item'} · {selectedResto.name}</p>
            {[
              { key:'name', label:'Item Name *', ph:'e.g. Chicken Biryani' },
              { key:'description', label:'Description', ph:'Short description' },
              { key:'image', label:'Image URL', ph:'https://...' },
              { key:'category', label:'Menu Category *', ph:'e.g. Biryani, Drinks, Starters' },
            ].map(f => (
              <div key={f.key}>
                <p className={label}>{f.label}</p>
                <input value={itemForm[f.key]} onChange={e=>setItemForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.ph} className={inp}/>
              </div>
            ))}

            {/* FIX 4: pricing grid changed from 3-col to 2-col on mobile, 3-col on sm+ */}
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
              <div>
                <p className={label}>MRP ₹ *</p>
                <input type='number' value={itemForm.price} onChange={e=>setItemForm(p=>({...p,price:e.target.value}))} placeholder='250' className={inp}/>
              </div>
              <div>
                <p className={label}>Selling Price ₹</p>
                <input type='number' value={itemForm.discountedPrice} onChange={e=>setItemForm(p=>({...p,discountedPrice:e.target.value}))} placeholder='199' className={inp}/>
              </div>
              <div className='col-span-2 sm:col-span-1'>
                <p className={label}>Snapit Margin ₹</p>
                <input type='number' value={itemForm.snapitMargin} onChange={e=>setItemForm(p=>({...p,snapitMargin:e.target.value}))} placeholder='20' className={inp}/>
              </div>
            </div>

            {/* FIX 5: price preview uses grid instead of justify-between so it never overflows */}
            {itemForm.price && (
              <div className='bg-slate-800 rounded-xl p-3 grid grid-cols-3 gap-2 text-center'>
                <div>
                  <p className='text-[9px] text-slate-500 uppercase font-black'>MRP</p>
                  <p className='text-sm font-black text-white'>₹{itemForm.price}</p>
                </div>
                <div>
                  <p className='text-[9px] text-slate-500 uppercase font-black'>Customer Pays</p>
                  <p className='text-sm font-black text-sky-400'>₹{itemForm.discountedPrice || itemForm.price}</p>
                </div>
                <div>
                  <p className='text-[9px] text-slate-500 uppercase font-black'>Snapit Gets</p>
                  <p className='text-sm font-black text-amber-400'>₹{itemForm.snapitMargin || 0}</p>
                </div>
              </div>
            )}

            <div className='flex gap-4 flex-wrap'>
              {[{key:'isVeg',label:'🌿 Veg'},{key:'isBestseller',label:'⭐ Bestseller'},{key:'isAvailable',label:'✅ Available'}].map(f=>(
                <label key={f.key} className='flex items-center gap-2 cursor-pointer'>
                  <input type='checkbox' checked={itemForm[f.key]} onChange={e=>setItemForm(p=>({...p,[f.key]:e.target.checked}))} className='w-4 h-4 accent-orange-500'/>
                  <span className='text-sm text-slate-300'>{f.label}</span>
                </label>
              ))}
            </div>
            <div className='flex gap-3'>
              <button onClick={handleSaveItem} disabled={saving || !itemForm.name || !itemForm.price || !itemForm.category}
                className='flex-1 bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black py-3 rounded-xl transition'>
                {saving ? 'Saving...' : editingItem ? '✓ Update Item' : '✓ Add to Menu'}
              </button>
              <button onClick={() => { setItemForm(EMPTY_ITEM); setEditingItem(null); setTab('menu') }}
                className='px-5 bg-slate-800 text-slate-400 font-black py-3 rounded-xl'>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}