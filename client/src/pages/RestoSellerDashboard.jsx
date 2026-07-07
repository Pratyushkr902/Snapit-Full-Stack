import React, { useEffect, useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import Axios from '../utils/Axios'
import toast from 'react-hot-toast'

const EMPTY_ITEM = {
  name: '', description: '', image: '', price: '', discountedPrice: '',
  snapitMargin: 0, category: '', isVeg: true, isBestseller: false, isAvailable: true
}

const STATUS_COLORS = {
  'Pending':          'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  'Confirmed':        'bg-blue-500/10 border-blue-500/30 text-blue-400',
  'Out for Delivery': 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  'Delivered':        'bg-green-500/10 border-green-500/30 text-green-400',
  'Cancelled':        'bg-red-500/10 border-red-500/30 text-red-400',
}
const STATUSES = ['Pending', 'Confirmed', 'Out for Delivery', 'Delivered', 'Cancelled']

export default function RestoSellerDashboard() {
  const user = useSelector(state => state.user)

  const [restaurant, setRestaurant]       = useState(null)
  const [menuItems, setMenuItems]         = useState([])
  const [tab, setTab]                     = useState('menu')
  const [itemForm, setItemForm]           = useState(EMPTY_ITEM)
  const [editingItem, setEditingItem]     = useState(null)
  const [saving, setSaving]               = useState(false)
  const [loading, setLoading]             = useState(true)
  const [uploadingImage, setUploadingImage] = useState(false)

  const [uploadingPhotoItemId, setUploadingPhotoItemId] = useState(null)

  // Orders
  const [orders, setOrders]               = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  useEffect(() => {
    const restoId = user?.restaurantId
    if (!restoId) { setLoading(false); return }
    loadRestaurant(restoId)
    loadMenu(restoId)
  }, [user])

  useEffect(() => {
    if (tab === 'orders') loadOrders()
  }, [tab])

  const loadRestaurant = async (id) => {
    try {
      const res = await Axios({ method: 'GET', url: `/api/restaurant/${id}` })
      if (res.data?.success) setRestaurant(res.data.data.restaurant)
    } catch { toast.error('Failed to load restaurant') }
    finally { setLoading(false) }
  }

  const loadMenu = async (id) => {
    try {
      const res = await Axios({ method: 'GET', url: `/api/restaurant/${id}/menu` })
      if (res.data?.success) setMenuItems(res.data.data)
    } catch { toast.error('Failed to load menu') }
  }

  const loadOrders = useCallback(async () => {
    if (!restaurant) return
    setOrdersLoading(true)
    try {
      const res = await Axios({ method: 'GET', url: '/api/order/resto-seller/orders' })
      if (res.data?.success) {
        const mine = res.data.data.filter(
          o => o.store_details?.name === restaurant.name
        )
        setOrders(mine)
      }
    } catch { toast.error('Failed to load orders') }
    finally { setOrdersLoading(false) }
  }, [restaurant])

  useEffect(() => {
    if (tab === 'orders' && restaurant) loadOrders()
  }, [restaurant])

  const handleToggleOpen = async () => {
    try {
      await Axios({ method: 'PATCH', url: `/api/restaurant/update/${restaurant._id}`, data: { isOpen: !restaurant.isOpen } })
      setRestaurant(prev => ({ ...prev, isOpen: !prev.isOpen }))
      toast.success(restaurant.isOpen ? 'Restaurant closed' : 'Restaurant opened')
    } catch { toast.error('Failed to update') }
  }

  // FIXED: now uploads to R2 instead of Cloudinary
  const handleImageUpload = async (e, field) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await Axios({ method: 'POST', url: '/api/file/upload-r2', data: fd })
      const url = res.data?.data?.url || res.data?.url
      if (url) setItemForm(p => ({ ...p, [field]: url }))
      else toast.error('Upload failed — no URL returned')
    } catch { toast.error('Image upload failed') }
    finally { setUploadingImage(false) }
  }

  // FIXED: now uploads to R2 instead of Cloudinary
  const handleInlineItemPhotoUpload = async (item, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhotoItemId(item._id)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const uploadRes = await Axios({ method: 'POST', url: '/api/file/upload-r2', data: fd })
      const url = uploadRes.data?.data?.url || uploadRes.data?.url
      if (!url) { toast.error('Upload failed — no URL returned'); return }

      await Axios({ method: 'PUT', url: `/api/restaurant/menu/${item._id}`, data: { image: url } })
      setMenuItems(prev => prev.map(i => i._id === item._id ? { ...i, image: url } : i))
      toast.success('Photo updated')
    } catch {
      toast.error('Failed to update photo')
    } finally {
      setUploadingPhotoItemId(null)
      e.target.value = ''
    }
  }

  const handleSaveItem = async () => {
    if (!itemForm.name || !itemForm.price || !itemForm.category) return
    setSaving(true)
    try {
      const body = {
        ...itemForm,
        price: Number(itemForm.price),
        discountedPrice: Number(itemForm.discountedPrice) || Number(itemForm.price),
        snapitMargin: Number(itemForm.snapitMargin) || 0,
        restaurantId: restaurant._id,
      }
      if (editingItem) {
        await Axios({ method: 'PUT', url: `/api/restaurant/menu/${editingItem._id}`, data: body })
        setMenuItems(prev => prev.map(i => i._id === editingItem._id ? { ...i, ...body } : i))
        toast.success('Item updated')
      } else {
        const res = await Axios({ method: 'POST', url: '/api/restaurant/menu/add', data: body })
        if (res.data?.success) setMenuItems(prev => [...prev, res.data.data])
        toast.success('Item added')
      }
      setItemForm(EMPTY_ITEM)
      setEditingItem(null)
      setTab('menu')
    } catch { toast.error('Failed to save item') }
    finally { setSaving(false) }
  }

  const handleEditItem = (item) => {
    setEditingItem(item)
    setItemForm({
      name: item.name, description: item.description || '', image: item.image || '',
      price: item.price || '', discountedPrice: item.discountedPrice || '',
      snapitMargin: item.snapitMargin || 0, category: item.category || '',
      isVeg: item.isVeg ?? true, isBestseller: item.isBestseller ?? false,
      isAvailable: item.isAvailable ?? true,
    })
    setTab('addItem')
  }

  const handleToggleAvailability = async (item) => {
    try {
      await Axios({ method: 'PUT', url: `/api/restaurant/menu/${item._id}`, data: { isAvailable: !item.isAvailable } })
      setMenuItems(prev => prev.map(i => i._id === item._id ? { ...i, isAvailable: !i.isAvailable } : i))
    } catch { toast.error('Failed to update') }
  }

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await Axios({ method: 'PUT', url: `/api/order/update-status/${orderId}`, data: { delivery_status: status } })
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, delivery_status: status } : o))
      toast.success('Status updated')
    } catch { toast.error('Failed to update status') }
  }

  const grouped = menuItems.reduce((acc, item) => {
    const cat = item.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const deliveredOrders = orders.filter(o => o.delivery_status === 'Delivered')
  const totalRevenue    = deliveredOrders.reduce((s, o) => s + (o.totalAmount || 0), 0)
  const totalSnapitCut  = deliveredOrders.reduce((s, o) => {
    const cut = (o.cartItems || []).reduce((a, i) => a + ((i.snapitMargin || 0) * (i.quantity || 1)), 0)
    return s + cut
  }, 0)
  const totalEarnings   = totalRevenue - totalSnapitCut

  const inp  = 'w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-500 placeholder-slate-500'
  const lbl  = 'text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1'

  if (loading) return (
    <div className='min-h-screen bg-slate-950 flex items-center justify-center'>
      <p className='text-slate-400 font-black text-sm animate-pulse'>Loading…</p>
    </div>
  )

  if (!restaurant) return (
    <div className='min-h-screen bg-slate-950 flex items-center justify-center p-6'>
      <div className='text-center'>
        <p className='text-2xl mb-2'>🍽️</p>
        <p className='text-white font-black mb-1'>No Restaurant Linked</p>
        <p className='text-slate-500 text-xs'>Ask admin to link your account to a restaurant.</p>
      </div>
    </div>
  )

  return (
    <div className='min-h-screen bg-slate-950 text-white'>

      {/* ── Header ── */}
      <div className='bg-slate-900 border-b border-slate-800 px-4 py-4'>
        <div className='flex items-center justify-between gap-3 flex-wrap'>
          <div className='flex items-center gap-3 min-w-0'>
            <div className='w-10 h-10 rounded-2xl overflow-hidden bg-slate-800 flex-shrink-0'>
              {restaurant.image
                ? <img src={restaurant.image} alt={restaurant.name} className='w-full h-full object-cover'/>
                : <div className='w-full h-full flex items-center justify-center text-xl'>🍽️</div>}
            </div>
            <div className='min-w-0'>
              <p className='font-black text-white text-sm truncate'>{restaurant.name}</p>
              <p className='text-[10px] text-slate-500 truncate'>{restaurant.cuisineTypes}</p>
            </div>
          </div>
          <button onClick={handleToggleOpen}
            className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black border transition-all ${
              restaurant.isOpen
                ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-green-500/10 hover:border-green-500/30 hover:text-green-400'
            }`}>
            <span className={`w-2 h-2 rounded-full ${restaurant.isOpen ? 'bg-green-400' : 'bg-red-400'}`}/>
            {restaurant.isOpen ? 'Open' : 'Closed'}
          </button>
        </div>

        {/* Stats row */}
        <div className='flex gap-4 mt-4 pt-4 border-t border-slate-800'>
          {[
            { label: 'Items',    value: menuItems.length },
            { label: 'Orders',   value: orders.length },
            { label: 'Earnings', value: `₹${totalEarnings.toLocaleString('en-IN')}` },
            { label: 'Rating',   value: `★ ${restaurant.rating || '—'}` },
          ].map(s => (
            <div key={s.label} className='flex-1 text-center'>
              <p className='text-base font-black text-orange-400'>{s.value}</p>
              <p className='text-[9px] text-slate-500 uppercase font-bold'>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className='bg-slate-900 border-b border-slate-800 flex overflow-x-auto scrollbar-none'>
        {[
          { key: 'menu',     label: '📋 Menu' },
          { key: 'addItem',  label: editingItem ? '✏️ Edit Item' : '➕ Add Item' },
          { key: 'orders',   label: '🛍️ Orders' },
          { key: 'earnings', label: '💰 Earnings' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-shrink-0 px-5 py-3 text-xs font-black whitespace-nowrap border-b-2 transition-all ${
              tab === t.key ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className='p-4'>

        {/* ── MENU LIST ── */}
        {tab === 'menu' && (
          <div>
            <div className='flex justify-between items-center mb-4'>
              <p className='text-sm font-black text-white'>{menuItems.length} items</p>
              <button onClick={() => { setEditingItem(null); setItemForm(EMPTY_ITEM); setTab('addItem') }}
                className='flex-shrink-0 bg-orange-500 text-white text-xs font-black px-3 py-2 rounded-xl'>
                + Add Item
              </button>
            </div>

            {menuItems.length === 0 ? (
              <div className='bg-slate-900 rounded-3xl p-12 text-center border-2 border-dashed border-slate-700'>
                <p className='text-4xl mb-3'>🍽️</p>
                <p className='text-white font-black mb-1'>No menu items yet</p>
                <p className='text-slate-500 text-xs'>Add your first item using the tab above</p>
              </div>
            ) : (
              Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} className='mb-6'>
                  <p className='text-xs font-black text-slate-400 uppercase tracking-widest mb-2 border-l-2 border-orange-500 pl-2'>{cat}</p>
                  <div className='grid grid-cols-1 gap-2'>
                    {items.map(item => (
                      <div key={item._id}
                        className={`bg-slate-900 border rounded-xl p-3 transition-opacity ${
                          item.isAvailable ? 'border-slate-800' : 'border-slate-700 opacity-50'
                        }`}>
                        <div className='flex items-start gap-3'>
                          <label className='relative w-14 h-14 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 cursor-pointer group'>
                            {item.image
                              ? <img src={item.image} alt={item.name} className='w-full h-full object-cover'/>
                              : <div className='w-full h-full flex items-center justify-center text-xl'>🍽️</div>}
                            <span className='absolute inset-0 bg-black/0 group-hover:bg-black/50 flex items-center justify-center transition-all'>
                              <span className='opacity-0 group-hover:opacity-100 text-[9px] font-black text-white'>
                                {uploadingPhotoItemId === item._id ? '⏳' : '📷'}
                              </span>
                            </span>
                            <input
                              type='file'
                              accept='image/*'
                              className='hidden'
                              disabled={uploadingPhotoItemId === item._id}
                              onChange={(e) => handleInlineItemPhotoUpload(item, e)}
                            />
                          </label>
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center gap-1.5 mb-0.5'>
                              <span className={`w-3 h-3 border-2 rounded-sm flex-shrink-0 inline-flex items-center justify-center ${item.isVeg ? 'border-green-500' : 'border-red-500'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`}/>
                              </span>
                              <p className='text-sm font-black text-white truncate'>{item.name}</p>
                              {item.isBestseller && <span className='text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full font-black flex-shrink-0'>★ BEST</span>}
                            </div>
                            {item.description && <p className='text-[10px] text-slate-500 truncate mb-1'>{item.description}</p>}
                            <div className='flex items-center gap-2'>
                              <p className='text-sm font-black text-white'>₹{item.discountedPrice || item.price}</p>
                              {item.discountedPrice && item.discountedPrice < item.price &&
                                <p className='text-[10px] text-slate-500 line-through'>₹{item.price}</p>}
                            </div>
                          </div>
                        </div>
                        {/* Actions */}
                        <div className='flex gap-2 mt-2'>
                          <button onClick={() => handleEditItem(item)}
                            className='flex-1 text-[10px] font-black py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700'>
                            ✏️ Edit
                          </button>
                          <button onClick={() => handleToggleAvailability(item)}
                            className={`flex-1 text-[10px] font-black py-1.5 rounded-lg border transition-all ${
                              item.isAvailable
                                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                : 'bg-red-500/10 border-red-500/30 text-red-400'
                            }`}>
                            {item.isAvailable ? '✅ Available' : '❌ Hidden'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── ADD / EDIT ITEM ── */}
        {tab === 'addItem' && (
          <div className='flex flex-col gap-4 w-full max-w-lg'>
            <p className='font-black text-white text-base'>
              {editingItem ? '✏️ Edit Item' : '➕ Add Menu Item'}
            </p>

            {/* Image upload */}
            <div>
              <p className={lbl}>Item Photo</p>
              <div className='flex gap-3 items-start'>
                <div className='w-20 h-20 rounded-xl bg-slate-800 border border-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center'>
                  {itemForm.image
                    ? <img src={itemForm.image} alt='preview' className='w-full h-full object-cover'/>
                    : <span className='text-2xl'>🍽️</span>}
                </div>
                <div className='flex-1 flex flex-col gap-2'>
                  <label className='cursor-pointer bg-slate-800 border border-slate-700 hover:border-orange-500 text-slate-300 text-xs font-black py-2.5 px-3 rounded-xl text-center transition-all'>
                    {uploadingImage ? '⏳ Uploading…' : '📷 Upload Photo'}
                    <input type='file' accept='image/*' className='hidden'
                      onChange={e => handleImageUpload(e, 'image')} disabled={uploadingImage}/>
                  </label>
                  <input value={itemForm.image}
                    onChange={e => setItemForm(p => ({ ...p, image: e.target.value }))}
                    placeholder='or paste image URL' className={inp + ' text-[11px]'}/>
                </div>
              </div>
            </div>

            {[
              { key: 'name',        label: 'Item Name *',   ph: 'e.g. Chicken Biryani' },
              { key: 'description', label: 'Description',   ph: 'Short description' },
              { key: 'category',    label: 'Category *',    ph: 'e.g. Biryani, Drinks, Starters' },
            ].map(f => (
              <div key={f.key}>
                <label className={lbl}>{f.label}</label>
                <input value={itemForm[f.key]}
                  onChange={e => setItemForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.ph} className={inp}/>
              </div>
            ))}

            {/* Category quick-pick */}
            {Object.keys(grouped).length > 0 && (
              <div>
                <p className={lbl}>Quick-pick category</p>
                <div className='flex gap-2 flex-wrap'>
                  {Object.keys(grouped).map(cat => (
                    <button key={cat}
                      onClick={() => setItemForm(p => ({ ...p, category: cat }))}
                      className={`text-xs font-black px-3 py-1.5 rounded-lg border transition-all ${
                        itemForm.category === cat
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
              <div>
                <label className={lbl}>MRP ₹ *</label>
                <input type='number' value={itemForm.price}
                  onChange={e => setItemForm(p => ({ ...p, price: e.target.value }))}
                  placeholder='250' className={inp}/>
              </div>
              <div>
                <label className={lbl}>Selling ₹</label>
                <input type='number' value={itemForm.discountedPrice}
                  onChange={e => setItemForm(p => ({ ...p, discountedPrice: e.target.value }))}
                  placeholder='199' className={inp}/>
              </div>
              <div className='col-span-2 sm:col-span-1'>
                <label className={lbl}>Snapit Cut ₹</label>
                <input type='number' value={itemForm.snapitMargin}
                  onChange={e => setItemForm(p => ({ ...p, snapitMargin: e.target.value }))}
                  placeholder='20' className={inp}/>
              </div>
            </div>

            {itemForm.price && (
              <div className='bg-slate-800 rounded-xl p-3'>
                <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 text-center'>
                  <div>
                    <p className='text-[9px] text-slate-500 uppercase font-black'>MRP</p>
                    <p className='text-sm font-black text-white'>₹{itemForm.price}</p>
                  </div>
                  <div>
                    <p className='text-[9px] text-slate-500 uppercase font-black'>Customer</p>
                    <p className='text-sm font-black text-sky-400'>₹{itemForm.discountedPrice || itemForm.price}</p>
                  </div>
                  <div>
                    <p className='text-[9px] text-amber-400/60 uppercase font-black'>Snapit</p>
                    <p className='text-sm font-black text-amber-400'>₹{itemForm.snapitMargin || 0}</p>
                  </div>
                  <div>
                    <p className='text-[9px] text-emerald-400/60 uppercase font-black'>You Get</p>
                    <p className='text-sm font-black text-emerald-400'>
                      ₹{Math.max(0, (Number(itemForm.discountedPrice) || Number(itemForm.price) || 0) - (Number(itemForm.snapitMargin) || 0))}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className='flex gap-4 flex-wrap'>
              {[
                { key: 'isVeg',        label: '🌿 Veg' },
                { key: 'isBestseller', label: '⭐ Bestseller' },
                { key: 'isAvailable',  label: '✅ Available' },
              ].map(f => (
                <label key={f.key} className='flex items-center gap-2 cursor-pointer'>
                  <input type='checkbox' checked={itemForm[f.key]}
                    onChange={e => setItemForm(p => ({ ...p, [f.key]: e.target.checked }))}
                    className='w-4 h-4 accent-orange-500'/>
                  <span className='text-sm text-slate-300'>{f.label}</span>
                </label>
              ))}
            </div>

            <div className='flex gap-3'>
              <button onClick={handleSaveItem}
                disabled={saving || !itemForm.name || !itemForm.price || !itemForm.category}
                className='flex-1 bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black py-3 rounded-xl transition'>
                {saving ? 'Saving...' : editingItem ? '✓ Update Item' : '✓ Add to Menu'}
              </button>
              <button onClick={() => { setItemForm(EMPTY_ITEM); setEditingItem(null); setTab('menu') }}
                className='px-5 bg-slate-800 text-slate-400 font-black py-3 rounded-xl'>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── ORDERS ── */}
        {tab === 'orders' && (
          <div>
            <div className='flex justify-between items-center mb-4'>
              <p className='text-sm font-black text-white'>{orders.length} Orders</p>
              <button onClick={loadOrders}
                className='text-xs font-black text-orange-400 bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 rounded-lg'>
                🔄 Refresh
              </button>
            </div>

            {ordersLoading && (
              <p className='text-slate-500 text-xs text-center py-8 animate-pulse'>Loading orders…</p>
            )}

            {!ordersLoading && orders.length === 0 && (
              <div className='bg-slate-900 rounded-3xl p-12 text-center border-2 border-dashed border-slate-700'>
                <p className='text-4xl mb-3'>🛍️</p>
                <p className='text-white font-black mb-1'>No orders yet</p>
                <p className='text-slate-500 text-xs'>Orders will appear here once customers place them</p>
              </div>
            )}

            <div className='flex flex-col gap-3'>
              {orders.map(order => (
                <div key={order._id} className='bg-slate-900 border border-slate-800 rounded-xl p-4'>
                  <div className='flex items-start justify-between gap-2 mb-3'>
                    <div>
                      <p className='text-xs font-black text-white'>{order.orderId}</p>
                      <p className='text-[10px] text-slate-500 mt-0.5'>
                        {order.userId?.name || 'Customer'} · {new Date(order.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                      </p>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${STATUS_COLORS[order.delivery_status] || 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                      {order.delivery_status || 'Pending'}
                    </span>
                  </div>

                  <div className='mb-3 flex flex-col gap-1'>
                    {(order.cartItems || []).map((ci, i) => (
                      <div key={i} className='flex justify-between text-xs text-slate-400'>
                        <span>{ci.name} × {ci.quantity || 1}</span>
                        <span>₹{(ci.discountedPrice || ci.price) * (ci.quantity || 1)}</span>
                      </div>
                    ))}
                  </div>

                  <div className='flex items-center justify-between border-t border-slate-800 pt-3'>
                    <p className='text-sm font-black text-white'>Total: ₹{order.totalAmount}</p>
                    <select
                      value={order.delivery_status || 'Pending'}
                      onChange={e => handleUpdateOrderStatus(order._id, e.target.value)}
                      className='bg-slate-800 border border-slate-700 text-white text-xs font-black rounded-lg px-2 py-1.5 outline-none focus:border-orange-500'>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── EARNINGS ── */}
        {tab === 'earnings' && (
          <div className='flex flex-col gap-4'>
            <p className='text-sm font-black text-white'>Earnings Overview</p>

            <div className='grid grid-cols-2 gap-3'>
              {[
                { label: 'Total Orders',     value: orders.length,                                          color: 'text-white' },
                { label: 'Delivered',        value: deliveredOrders.length,                                 color: 'text-green-400' },
                { label: 'Gross Revenue',    value: `₹${totalRevenue.toLocaleString('en-IN')}`,             color: 'text-sky-400' },
                { label: 'Snapit Cut',       value: `₹${totalSnapitCut.toLocaleString('en-IN')}`,           color: 'text-amber-400' },
              ].map(c => (
                <div key={c.label} className='bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center'>
                  <p className={`text-xl font-black ${c.color}`}>{c.value}</p>
                  <p className='text-[10px] text-slate-500 uppercase font-black mt-1'>{c.label}</p>
                </div>
              ))}
            </div>

            <div className='bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center'>
              <p className='text-[11px] text-emerald-400/70 uppercase font-black mb-1'>Your Net Earnings</p>
              <p className='text-4xl font-black text-emerald-400'>₹{totalEarnings.toLocaleString('en-IN')}</p>
              <p className='text-[10px] text-slate-500 mt-2'>From {deliveredOrders.length} delivered orders</p>
            </div>

            {deliveredOrders.length > 0 && (
              <div>
                <p className='text-xs font-black text-slate-400 uppercase tracking-widest mb-2 border-l-2 border-orange-500 pl-2'>Delivered Orders Breakdown</p>
                <div className='flex flex-col gap-2'>
                  {deliveredOrders.map(order => {
                    const snapCut = (order.cartItems || []).reduce((a, i) => a + ((i.snapitMargin || 0) * (i.quantity || 1)), 0)
                    const earned  = (order.totalAmount || 0) - snapCut
                    return (
                      <div key={order._id} className='bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex justify-between items-center'>
                        <div>
                          <p className='text-xs font-black text-white'>{order.orderId}</p>
                          <p className='text-[10px] text-slate-500'>{new Date(order.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</p>
                        </div>
                        <div className='text-right'>
                          <p className='text-sm font-black text-emerald-400'>₹{earned}</p>
                          <p className='text-[10px] text-amber-400/70'>-₹{snapCut} cut</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {orders.length === 0 && (
              <div className='bg-slate-900 rounded-3xl p-12 text-center border-2 border-dashed border-slate-700'>
                <p className='text-4xl mb-3'>💰</p>
                <p className='text-white font-black mb-1'>No earnings yet</p>
                <p className='text-slate-500 text-xs'>Earnings will show up here once orders are delivered</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}