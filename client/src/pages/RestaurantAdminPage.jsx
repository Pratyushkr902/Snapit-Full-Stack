import React, { useEffect, useState, useCallback } from 'react'
import Axios from '../utils/Axios'
import toast from 'react-hot-toast'

const EMPTY_RESTO = {
  name: '', description: '', image: '', cuisineTypes: '',
  deliveryTimeMin: 20, deliveryTimeMax: 40, deliveryFee: 0,
  minOrderValue: 0, isPureVeg: false, isOpen: true, offers: ''
}
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

// ── Reusable Image Upload Widget ──────────────────────────────────────────────
function ImageUploadField({ value, onChange, label = 'Photo', uploadingImage, onFileChange }) {
  const inp = 'w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-500 placeholder-slate-500'
  const lbl = 'text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1'
  return (
    <div>
      <p className={lbl}>{label}</p>
      <div className='flex gap-3 items-start'>
        <div className='w-20 h-20 rounded-xl bg-slate-800 border border-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center'>
          {value
            ? <img src={value} alt='preview' className='w-full h-full object-cover'/>
            : <span className='text-2xl'>🍽️</span>}
        </div>
        <div className='flex-1 flex flex-col gap-2'>
          <label className='cursor-pointer bg-slate-800 border border-slate-700 hover:border-orange-500 text-slate-300 text-xs font-black py-2.5 px-3 rounded-xl text-center transition-all'>
            {uploadingImage ? '⏳ Uploading…' : '📷 Upload Photo'}
            <input type='file' accept='image/*' className='hidden' onChange={onFileChange} disabled={uploadingImage}/>
          </label>
          <input value={value} onChange={e => onChange(e.target.value)}
            placeholder='or paste image URL' className={inp + ' text-[11px]'}/>
        </div>
      </div>
    </div>
  )
}

// ── Store Open/Closed Toggle ───────────────────────────────────────────────────
function OpenClosedToggle({ isOpen, busy, onToggle, size = 'md' }) {
  const sizes = {
    md: { track: 'w-12 h-6', thumb: 'w-5 h-5', translate: 'translate-x-6' },
    sm: { track: 'w-9 h-5',  thumb: 'w-4 h-4', translate: 'translate-x-4' },
  }
  const s = sizes[size] || sizes.md
  return (
    <button
      type='button'
      disabled={busy}
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      className='flex items-center gap-2 disabled:opacity-50'
      title={isOpen ? 'Store is open — tap to close' : 'Store is closed — tap to open'}
    >
      <span className={`text-[10px] font-black ${isOpen ? 'text-green-400' : 'text-red-400'}`}>
        {busy ? '...' : isOpen ? '● OPEN' : '● CLOSED'}
      </span>
      <span className={`relative ${s.track} rounded-full transition-colors ${isOpen ? 'bg-green-500' : 'bg-slate-700'}`}>
        <span className={`absolute top-0.5 left-0.5 ${s.thumb} bg-white rounded-full shadow transition-transform ${isOpen ? s.translate : ''}`}/>
      </span>
    </button>
  )
}

// ── Order Row Component ────────────────────────────────────────────────────────
function OrderRow({ order, onUpdateStatus, getOrderNetEarnings }) {
  const isCancelled = order.delivery_status === 'Cancelled'
  const net = getOrderNetEarnings(order)
  return (
    <div className='bg-slate-900 border border-slate-800 rounded-xl p-4'>
      <div className='flex items-start justify-between gap-2 mb-3'>
        <div>
          <p className='text-xs font-black text-white'>{order.orderId}</p>
          <p className='text-[10px] text-slate-500 mt-0.5'>
            {order.userId?.name || 'Customer'} · {order.store_details?.name} · {' '}
            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
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
        <div>
          <p className='text-sm font-black text-white'>₹{order.totalAmt}</p>
          {!isCancelled && (
            <p className='text-[10px] font-black text-emerald-400'>You earn ₹{net.toFixed(0)}</p>
          )}
        </div>
        <select
          value={order.delivery_status || 'Pending'}
          onChange={e => onUpdateStatus(order._id, e.target.value)}
          className='bg-slate-800 border border-slate-700 text-white text-xs font-black rounded-lg px-2 py-1.5 outline-none focus:border-orange-500'>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
  )
}

// ── Main Admin Page ────────────────────────────────────────────────────────────
export default function RestaurantAdminPage() {
  const [restaurants, setRestaurants]     = useState([])
  const [selectedResto, setSelectedResto] = useState(null)
  const [menuItems, setMenuItems]         = useState([])
  const [orders, setOrders]               = useState([])
  const [tab, setTab]                     = useState('restaurants')
  const [restoForm, setRestoForm]         = useState(EMPTY_RESTO)
  const [itemForm, setItemForm]           = useState(EMPTY_ITEM)
  const [editingItem, setEditingItem]     = useState(null)
  const [editingResto, setEditingResto]   = useState(null)
  const [saving, setSaving]               = useState(false)
  const [loading, setLoading]             = useState(true)
  const [uploadingRestoImage, setUploadingRestoImage] = useState(false)
  const [uploadingItemImage,  setUploadingItemImage]  = useState(false)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [togglingRestoId, setTogglingRestoId] = useState(null)
  const [uploadingPhotoItemId, setUploadingPhotoItemId] = useState(null)
  const [menuSearch, setMenuSearch] = useState('')

  const inp   = 'w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-500 placeholder-slate-500'
  const label = 'text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1'

  useEffect(() => { loadRestaurants() }, [])
  useEffect(() => { if (selectedResto) { loadMenu(selectedResto._id); loadOrders() } }, [selectedResto])

  const loadRestaurants = async () => {
    try {
      const res = await Axios({ method: 'GET', url: '/api/restaurant/all' })
      if (res.data?.success) setRestaurants(res.data.data)
    } catch { toast.error('Failed to load restaurants') }
    finally { setLoading(false) }
  }

  const loadMenu = async (id) => {
    try {
      const res = await Axios({ method: 'GET', url: `/api/restaurant/${id}/menu` })
      if (res.data?.success) setMenuItems(res.data.data)
    } catch { toast.error('Failed to load menu') }
  }

  const loadOrders = async () => {
    setOrdersLoading(true)
    try {
      const res = await Axios({ method: 'GET', url: '/api/order/admin/restaurant-orders' })
      if (res.data?.success) setOrders(res.data.data)
    } catch { toast.error('Failed to load orders') }
    finally { setOrdersLoading(false) }
  }

  // FIXED: all image uploads now go to R2 instead of Cloudinary
  const uploadImage = async (file, setUploading) => {
    if (setUploading) setUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await Axios({ method: 'POST', url: '/api/file/upload-r2', data: fd })
      return res.data?.data?.secure_url || res.data?.secure_url || null
    } catch { toast.error('Image upload failed'); return null }
    finally { if (setUploading) setUploading(false) }
  }

  const handleRestoImageUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const url = await uploadImage(file, setUploadingRestoImage)
    if (url) setRestoForm(p => ({ ...p, image: url }))
  }

  const handleItemImageUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const url = await uploadImage(file, setUploadingItemImage)
    if (url) setItemForm(p => ({ ...p, image: url }))
  }

  const handleInlineItemPhotoUpload = async (item, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhotoItemId(item._id)
    try {
      const url = await uploadImage(file, null)
      if (!url) return
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

  const handleToggleOpen = async (resto) => {
    const nextOpen = !resto.isOpen
    setTogglingRestoId(resto._id)
    try {
      await Axios({ method: 'PATCH', url: `/api/restaurant/update/${resto._id}`, data: { isOpen: nextOpen } })
      setRestaurants(prev => prev.map(r => r._id === resto._id ? { ...r, isOpen: nextOpen } : r))
      setSelectedResto(prev => (prev && prev._id === resto._id) ? { ...prev, isOpen: nextOpen } : prev)
      toast.success(nextOpen ? 'Store is now Open' : 'Store is now Closed')
    } catch {
      toast.error('Failed to update store status')
    } finally {
      setTogglingRestoId(null)
    }
  }

  const handleSaveResto = async () => {
    if (!restoForm.name) return
    setSaving(true)
    try {
      const body = {
        ...restoForm,
        cuisineTypes: restoForm.cuisineTypes.split(',').map(s => s.trim()).filter(Boolean),
        offers: restoForm.offers.split('\n').map(s => s.trim()).filter(Boolean),
      }
      if (editingResto) {
        await Axios({ method: 'PATCH', url: `/api/restaurant/update/${editingResto._id}`, data: body })
        setRestaurants(prev => prev.map(r => r._id === editingResto._id ? { ...r, ...body } : r))
        toast.success('Restaurant updated')
      } else {
        const res = await Axios({ method: 'POST', url: '/api/restaurant/add', data: body })
        if (res.data?.success) setRestaurants(prev => [...prev, res.data.data])
        toast.success('Restaurant created')
      }
      setRestoForm(EMPTY_RESTO); setEditingResto(null); setTab('restaurants')
    } catch { toast.error('Failed to save restaurant') }
    finally { setSaving(false) }
  }

  const handleSaveItem = async () => {
    if (!itemForm.name || !itemForm.price || !itemForm.category) return
    setSaving(true)
    try {
      const priceNum = Number(itemForm.price)
      const discountedNum = itemForm.discountedPrice !== '' ? Number(itemForm.discountedPrice) : 0
      const body = {
        ...itemForm,
        price: priceNum,
        discountedPrice: discountedNum,
        snapitMargin: Number(itemForm.snapitMargin) || 0,
        restaurantId: selectedResto._id,
      }
      if (editingItem) {
        const res = await Axios({ method: 'PUT', url: `/api/restaurant/menu/${editingItem._id}`, data: body })
        const updated = res.data?.data || { ...editingItem, ...body }
        setMenuItems(prev => prev.map(i => i._id === editingItem._id ? updated : i))
        toast.success('Item updated')
      } else {
        const res = await Axios({ method: 'POST', url: '/api/restaurant/menu/add', data: body })
        if (res.data?.success) setMenuItems(prev => [...prev, res.data.data])
        toast.success('Item added')
      }
      setItemForm(EMPTY_ITEM); setEditingItem(null); setTab('menu')
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

  const handleEditResto = (r) => {
    setEditingResto(r)
    setRestoForm({
      name: r.name, description: r.description || '', image: r.image || '',
      cuisineTypes: Array.isArray(r.cuisineTypes) ? r.cuisineTypes.join(', ') : (r.cuisineTypes || ''),
      deliveryTimeMin: r.deliveryTimeMin || 20, deliveryTimeMax: r.deliveryTimeMax || 40,
      deliveryFee: r.deliveryFee || 0, minOrderValue: r.minOrderValue || 0,
      isPureVeg: r.isPureVeg || false, isOpen: r.isOpen ?? true,
      offers: Array.isArray(r.offers) ? r.offers.join('\n') : (r.offers || ''),
    })
    setTab('addResto')
  }

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await Axios({ method: 'PUT', url: `/api/order/update-status/${orderId}`, data: { delivery_status: status } })
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, delivery_status: status } : o))
      toast.success('Status updated')
    } catch { toast.error('Failed to update status') }
  }

  const getItemNet = useCallback((ci) => {
    let margin = ci.snapitMargin
    if (margin === undefined || margin === null) {
      const menuItem = menuItems.find(m => m.name === ci.name)
      margin = menuItem?.snapitMargin || 0
    }
    const price = ci.discountedPrice || ci.price || 0
    return Math.max(0, price - margin) * (ci.quantity || 1)
  }, [menuItems])

  const getOrderNetEarnings = useCallback((order) => {
    if (order.delivery_status === 'Cancelled') return 0
    return (order.cartItems || []).reduce((sum, ci) => sum + getItemNet(ci), 0)
  }, [getItemNet])

  const filteredMenuItems = menuSearch.trim()
    ? menuItems.filter(item =>
        item.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
        item.category.toLowerCase().includes(menuSearch.toLowerCase())
      )
    : menuItems

  const grouped = filteredMenuItems.reduce((acc, item) => {
    const cat = item.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item); return acc
  }, {})

  if (loading) return (
    <div className='min-h-screen bg-slate-950 flex items-center justify-center'>
      <p className='text-slate-400 font-black text-sm animate-pulse'>Loading…</p>
    </div>
  )

  const restoOrders = orders.filter(o => o.store_details?.name === selectedResto?.name)
  const deliveredOrders = restoOrders.filter(o => o.delivery_status === 'Delivered')
  const cancelledCount = restoOrders.filter(o => o.delivery_status === 'Cancelled').length
  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.totalAmt || 0), 0)
  const totalNetEarnings = restoOrders.reduce((sum, o) => sum + getOrderNetEarnings(o), 0)
  const totalSnapitCut = Math.max(0, totalRevenue - totalNetEarnings)

  return (
    <div className='min-h-screen bg-slate-950 text-white'>

      {/* ── Header ── */}
      <div className='bg-slate-900 border-b border-slate-800 px-4 py-4'>
        <div className='flex items-center justify-between'>
          <div>
            <p className='font-black text-white text-base'>🍽️ Restaurant Admin</p>
            {selectedResto && <p className='text-[10px] text-orange-400 mt-0.5'>{selectedResto.name}</p>}
          </div>
          <div className='flex items-center gap-3'>
            {selectedResto && (
              <OpenClosedToggle
                isOpen={selectedResto.isOpen}
                busy={togglingRestoId === selectedResto._id}
                onToggle={() => handleToggleOpen(selectedResto)}
              />
            )}
            {selectedResto && (
              <button onClick={() => { setSelectedResto(null); setMenuItems([]); setTab('restaurants'); setMenuSearch('') }}
                className='text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg font-black'>
                ← All Restos
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className='bg-slate-900 border-b border-slate-800 flex overflow-x-auto scrollbar-none'>
        {[
          { key: 'restaurants', label: '🏠 Restaurants' },
          { key: 'addResto',    label: editingResto ? '✏️ Edit Resto' : '➕ Add Resto' },
          ...(selectedResto ? [
            { key: 'menu',    label: '📋 Menu' },
            { key: 'addItem', label: editingItem ? '✏️ Edit Item' : '➕ Add Item' },
            { key: 'orders',  label: '🛍️ Orders & Earnings' },
          ] : []),
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

        {/* ── RESTAURANTS LIST ── */}
        {tab === 'restaurants' && (
          <div>
            <div className='flex justify-between items-center mb-4'>
              <p className='text-sm font-black text-white'>{restaurants.length} Restaurants</p>
              <button onClick={() => { setEditingResto(null); setRestoForm(EMPTY_RESTO); setTab('addResto') }}
                className='bg-orange-500 text-white text-xs font-black px-3 py-2 rounded-xl'>
                + Add Restaurant
              </button>
            </div>

            {restaurants.length === 0 ? (
              <div className='bg-slate-900 rounded-3xl p-12 text-center border-2 border-dashed border-slate-700'>
                <p className='text-4xl mb-3'>🍽️</p>
                <p className='text-white font-black mb-1'>No restaurants yet</p>
              </div>
            ) : (
              <div className='grid grid-cols-1 gap-3'>
                {restaurants.map(r => (
                  <div key={r._id} className='bg-slate-900 border border-slate-800 rounded-xl overflow-hidden'>
                    <div className='flex items-center gap-3 p-3'>
                      <div className='w-16 h-16 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 cursor-pointer' onClick={() => { setSelectedResto(r); setTab('menu') }}>
                        {r.image
                          ? <img src={r.image} alt={r.name} className='w-full h-full object-cover'/>
                          : <div className='w-full h-full flex items-center justify-center text-2xl'>🍽️</div>}
                      </div>
                      <div className='flex-1 min-w-0 cursor-pointer' onClick={() => { setSelectedResto(r); setTab('menu') }}>
                        <p className='font-black text-white text-sm truncate'>{r.name}</p>
                        <p className='text-[10px] text-slate-500 truncate'>
                          {Array.isArray(r.cuisineTypes) ? r.cuisineTypes.join(', ') : r.cuisineTypes}
                        </p>
                        <div className='flex items-center gap-2 mt-1'>
                          {r.isPureVeg && <span className='text-[9px] font-black px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400'>Pure Veg</span>}
                          <span className='text-[9px] text-slate-500'>★ {r.rating || '—'}</span>
                        </div>
                      </div>
                      <div className='flex flex-col items-end gap-2 flex-shrink-0'>
                        <OpenClosedToggle
                          isOpen={r.isOpen}
                          busy={togglingRestoId === r._id}
                          onToggle={() => handleToggleOpen(r)}
                          size='sm'
                        />
                        <button onClick={() => handleEditResto(r)}
                          className='bg-slate-800 border border-slate-700 text-slate-300 text-xs font-black px-3 py-2 rounded-xl hover:border-orange-500 transition-all'>
                          ✏️ Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ADD / EDIT RESTAURANT ── */}
        {tab === 'addResto' && (
          <div className='flex flex-col gap-4 w-full max-w-lg'>
            <p className='font-black text-white text-base'>{editingResto ? '✏️ Edit Restaurant' : '➕ New Restaurant'}</p>

            <ImageUploadField
              label='Cover Photo'
              value={restoForm.image}
              onChange={url => setRestoForm(p => ({ ...p, image: url }))}
              uploadingImage={uploadingRestoImage}
              onFileChange={handleRestoImageUpload}
            />

            {[
              { key: 'name',         label: 'Restaurant Name *', ph: 'e.g. Dom Biryani' },
              { key: 'description',  label: 'Description',       ph: 'Short tagline' },
              { key: 'cuisineTypes', label: 'Cuisine Types (comma separated)', ph: 'e.g. Biryani, North Indian' },
              { key: 'offers',       label: 'Offers (one per line)', ph: '50% OFF up to ₹100\nFree delivery above ₹199' },
            ].map(f => (
              <div key={f.key}>
                <p className={label}>{f.label}</p>
                {f.key === 'offers'
                  ? <textarea value={restoForm[f.key]} onChange={e => setRestoForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.ph} rows={3} className={inp}/>
                  : <input value={restoForm[f.key]} onChange={e => setRestoForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.ph} className={inp}/>
                }
              </div>
            ))}

            <div className='grid grid-cols-2 gap-3'>
              {[
                { key: 'deliveryTimeMin', label: 'Min Delivery (min)' },
                { key: 'deliveryTimeMax', label: 'Max Delivery (min)' },
                { key: 'deliveryFee',     label: 'Delivery Fee ₹' },
                { key: 'minOrderValue',   label: 'Min Order ₹' },
              ].map(f => (
                <div key={f.key}>
                  <p className={label}>{f.label}</p>
                  <input type='number' value={restoForm[f.key]} onChange={e => setRestoForm(p => ({ ...p, [f.key]: e.target.value }))} className={inp}/>
                </div>
              ))}
            </div>

            <div className='flex gap-4 flex-wrap items-center'>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input type='checkbox' checked={restoForm.isPureVeg} onChange={e => setRestoForm(p => ({ ...p, isPureVeg: e.target.checked }))} className='w-4 h-4 accent-orange-500'/>
                <span className='text-sm text-slate-300'>Pure Veg</span>
              </label>
              <div className='flex items-center gap-2'>
                <span className='text-sm text-slate-300'>Open Now</span>
                <OpenClosedToggle
                  isOpen={restoForm.isOpen}
                  busy={false}
                  onToggle={() => setRestoForm(p => ({ ...p, isOpen: !p.isOpen }))}
                  size='sm'
                />
              </div>
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

        {/* ── MENU LIST ── */}
        {tab === 'menu' && selectedResto && (
          <div>
            <div className='flex justify-between items-center mb-3'>
              <p className='text-sm font-black text-white'>{menuItems.length} items · {selectedResto.name}</p>
              <button onClick={() => { setEditingItem(null); setItemForm(EMPTY_ITEM); setTab('addItem') }}
                className='flex-shrink-0 bg-orange-500 text-white text-xs font-black px-3 py-2 rounded-xl'>
                + Add Item
              </button>
            </div>

            {/* ── SEARCH BAR ── */}
            <div className='relative mb-4'>
              <svg className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'/>
              </svg>
              <input
                value={menuSearch}
                onChange={e => setMenuSearch(e.target.value)}
                placeholder='Search items or category...'
                className='w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-9 pr-9 py-2.5 text-sm outline-none focus:border-orange-500 placeholder-slate-500'
              />
              {menuSearch && (
                <button onClick={() => setMenuSearch('')} className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white'>
                  <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12'/>
                  </svg>
                </button>
              )}
            </div>

            {menuSearch && (
              <p className='text-xs text-slate-500 mb-3'>
                {filteredMenuItems.length} result{filteredMenuItems.length !== 1 ? 's' : ''} for "{menuSearch}"
              </p>
            )}

            {menuItems.length === 0 ? (
              <div className='bg-slate-900 rounded-3xl p-12 text-center border-2 border-dashed border-slate-700'>
                <p className='text-4xl mb-3'>🍽️</p>
                <p className='text-white font-black mb-1'>No items yet</p>
                <p className='text-slate-500 text-xs'>Add menu items using the tab above</p>
              </div>
            ) : filteredMenuItems.length === 0 ? (
              <div className='bg-slate-900 rounded-3xl p-8 text-center border border-slate-800'>
                <p className='text-2xl mb-2'>🔍</p>
                <p className='text-slate-400 text-sm font-black'>No items match "{menuSearch}"</p>
              </div>
            ) : (
              Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} className='mb-6'>
                  <p className='text-xs font-black text-slate-400 uppercase tracking-widest mb-2 border-l-2 border-orange-500 pl-2'>
                    {cat} <span className='text-slate-600 font-normal normal-case tracking-normal'>({items.length})</span>
                  </p>
                  <div className='grid grid-cols-1 gap-2'>
                    {items.map(item => (
                      <div key={item._id} className={`bg-slate-900 border rounded-xl p-3 ${item.isAvailable ? 'border-slate-800' : 'border-slate-700 opacity-50'}`}>
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
                              type='file' accept='image/*' className='hidden'
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
                              <p className='text-sm font-black text-white'>
                                ₹{item.discountedPrice > 0 ? item.discountedPrice : item.price}
                              </p>
                              {item.discountedPrice > 0 && item.discountedPrice < item.price &&
                                <p className='text-[10px] text-slate-500 line-through'>₹{item.price}</p>}
                              <p className='text-[10px] text-amber-400/70'>cut ₹{item.snapitMargin || 0}</p>
                            </div>
                          </div>
                        </div>
                        <div className='flex gap-2 mt-2'>
                          <button onClick={() => handleEditItem(item)}
                            className='flex-1 text-[10px] font-black py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700'>
                            ✏️ Edit
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

        {/* ── ADD / EDIT MENU ITEM ── */}
        {tab === 'addItem' && selectedResto && (
          <div className='flex flex-col gap-4 w-full max-w-lg'>
            <p className='font-black text-white text-base'>{editingItem ? '✏️ Edit Item' : '➕ Add Menu Item'} · {selectedResto.name}</p>

            <ImageUploadField
              label='Item Photo'
              value={itemForm.image}
              onChange={url => setItemForm(p => ({ ...p, image: url }))}
              uploadingImage={uploadingItemImage}
              onFileChange={handleItemImageUpload}
            />

            {[
              { key: 'name',        label: 'Item Name *',  ph: 'e.g. Chicken Biryani' },
              { key: 'description', label: 'Description',  ph: 'Short description' },
              { key: 'category',    label: 'Menu Category *', ph: 'e.g. Biryani, Drinks, Starters' },
            ].map(f => (
              <div key={f.key}>
                <p className={label}>{f.label}</p>
                <input value={itemForm[f.key]} onChange={e => setItemForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.ph} className={inp}/>
              </div>
            ))}

            {Object.keys(grouped).length > 0 && (
              <div>
                <p className={label}>Quick-pick category</p>
                <div className='flex gap-2 flex-wrap'>
                  {Object.keys(grouped).map(cat => (
                    <button key={cat} onClick={() => setItemForm(p => ({ ...p, category: cat }))}
                      className={`text-xs font-black px-3 py-1.5 rounded-lg border transition-all ${
                        itemForm.category === cat ? 'bg-orange-500 border-orange-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
              <div>
                <p className={label}>MRP ₹ *</p>
                <input type='number' value={itemForm.price} onChange={e => setItemForm(p => ({ ...p, price: e.target.value }))} placeholder='250' className={inp}/>
              </div>
              <div>
                <p className={label}>Selling ₹</p>
                <input type='number' value={itemForm.discountedPrice} onChange={e => setItemForm(p => ({ ...p, discountedPrice: e.target.value }))} placeholder='199' className={inp}/>
              </div>
              <div className='col-span-2 sm:col-span-1'>
                <p className={label}>Snapit Cut ₹</p>
                <input type='number' value={itemForm.snapitMargin} onChange={e => setItemForm(p => ({ ...p, snapitMargin: e.target.value }))} placeholder='20' className={inp}/>
              </div>
            </div>

            {itemForm.price && (
              <div className='bg-slate-800 rounded-xl p-3'>
                <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 text-center'>
                  <div><p className='text-[9px] text-slate-500 uppercase font-black'>MRP</p><p className='text-sm font-black text-white'>₹{itemForm.price}</p></div>
                  <div><p className='text-[9px] text-slate-500 uppercase font-black'>Customer</p><p className='text-sm font-black text-sky-400'>₹{itemForm.discountedPrice || itemForm.price}</p></div>
                  <div><p className='text-[9px] text-amber-400/60 uppercase font-black'>Snapit</p><p className='text-sm font-black text-amber-400'>₹{itemForm.snapitMargin || 0}</p></div>
                  <div><p className='text-[9px] text-emerald-400/60 uppercase font-black'>You Get</p>
                    <p className='text-sm font-black text-emerald-400'>₹{Math.max(0, (Number(itemForm.discountedPrice) || Number(itemForm.price) || 0) - (Number(itemForm.snapitMargin) || 0))}</p>
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
                  <input type='checkbox' checked={itemForm[f.key]} onChange={e => setItemForm(p => ({ ...p, [f.key]: e.target.checked }))} className='w-4 h-4 accent-orange-500'/>
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

        {/* ── ORDERS & EARNINGS ── */}
        {tab === 'orders' && selectedResto && (
          <div>
            <div className='flex justify-between items-center mb-4'>
              <p className='text-sm font-black text-white'>{restoOrders.length} Orders · {selectedResto.name}</p>
              <button onClick={loadOrders} className='text-xs font-black text-orange-400 bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 rounded-lg'>
                🔄 Refresh
              </button>
            </div>

            <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5'>
              <div className='bg-slate-900 border border-slate-800 rounded-xl p-3 text-center'>
                <p className='text-[9px] text-slate-500 uppercase font-black'>Delivered</p>
                <p className='text-base font-black text-white'>{deliveredOrders.length}</p>
              </div>
              <div className='bg-slate-900 border border-slate-800 rounded-xl p-3 text-center'>
                <p className='text-[9px] text-slate-500 uppercase font-black'>Cancelled</p>
                <p className='text-base font-black text-red-400'>{cancelledCount}</p>
              </div>
              <div className='bg-slate-900 border border-slate-800 rounded-xl p-3 text-center'>
                <p className='text-[9px] text-amber-400/70 uppercase font-black'>Snapit Cut</p>
                <p className='text-base font-black text-amber-400'>₹{totalSnapitCut.toFixed(0)}</p>
              </div>
              <div className='bg-slate-900 border border-emerald-500/30 rounded-xl p-3 text-center'>
                <p className='text-[9px] text-emerald-400/70 uppercase font-black'>You Earn</p>
                <p className='text-base font-black text-emerald-400'>₹{totalNetEarnings.toFixed(0)}</p>
              </div>
            </div>

            {ordersLoading && <p className='text-slate-500 text-xs text-center py-8 animate-pulse'>Loading orders…</p>}

            {!ordersLoading && restoOrders.length === 0 && (
              <div className='bg-slate-900 rounded-3xl p-12 text-center border-2 border-dashed border-slate-700'>
                <p className='text-4xl mb-3'>🛍️</p>
                <p className='text-white font-black mb-1'>No orders for this restaurant</p>
              </div>
            )}

            <div className='flex flex-col gap-3'>
              {restoOrders.map(order => (
                <OrderRow
                  key={order._id}
                  order={order}
                  onUpdateStatus={handleUpdateOrderStatus}
                  getOrderNetEarnings={getOrderNetEarnings}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}