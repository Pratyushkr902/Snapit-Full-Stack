import React, { useEffect, useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import Axios from '../utils/Axios'
import toast from 'react-hot-toast'
import SummaryApi from '../common/SummaryApi'

const EMPTY_ITEM = {
  name: '', description: '', image: '', price: '', discountedPrice: '',
  snapitMargin: 0, category: '', isVeg: true, isBestseller: false, isAvailable: true
}

export default function RestoSellerDashboard() {
  const user = useSelector(state => state.user)

  const [restaurant, setRestaurant] = useState(null)
  const [menuItems, setMenuItems]   = useState([])
  const [tab, setTab]               = useState('menu')
  const [itemForm, setItemForm]     = useState(EMPTY_ITEM)
  const [editingItem, setEditingItem] = useState(null)
  const [saving, setSaving]         = useState(false)
  const [loading, setLoading]       = useState(true)
  const [orders, setOrders]         = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    const restoId = user?.restaurantId
    if (!restoId) { setLoading(false); return }
    loadRestaurant(restoId)
    loadMenu(restoId)
  }, [user])

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
    if (!user?.restaurantId) return
    try {
      setOrdersLoading(true)
      const res = await Axios({ method: 'GET', url: '/api/order/resto-seller/orders' })
      if (res.data?.success) setOrders(res.data.data || [])
    } catch { toast.error('Failed to load orders') }
    finally { setOrdersLoading(false) }
  }, [user])

  useEffect(() => {
    if (tab === 'orders') loadOrders()
  }, [tab, loadOrders])

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await Axios({ method: 'POST', url: '/api/upload/image', data: formData })
      if (res.data?.success) {
        setItemForm(p => ({ ...p, [field]: res.data.data.url }))
        toast.success('Image uploaded!')
      }
    } catch { toast.error('Upload failed') }
    finally { setUploadingImage(false) }
  }

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await Axios({ method: 'PATCH', url: `/api/food-order/${orderId}/status`, data: { status } })
      toast.success('Order updated!')
      loadOrders()
    } catch { toast.error('Failed to update order') }
  }

  const handleToggleOpen = async () => {
    try {
      await Axios({ method: 'PATCH', url: `/api/restaurant/update/${restaurant._id}`, data: { isOpen: !restaurant.isOpen } })
      setRestaurant(prev => ({ ...prev, isOpen: !prev.isOpen }))
      toast.success(restaurant.isOpen ? 'Restaurant closed' : 'Restaurant opened')
    } catch { toast.error('Failed to update') }
  }

  const handleSaveItem = async () => {
    setSaving(true)
    try {
      const body = {
        ...itemForm,
        price: Number(itemForm.price),
        discountedPrice: Number(itemForm.discountedPrice) || 0,
        snapitMargin: Number(itemForm.snapitMargin) || 0,
      }
      if (editingItem) {
        await Axios({ method: 'PUT', url: `/api/restaurant/menu/${editingItem._id}`, data: body })
        toast.success('Item updated!')
      } else {
        await Axios({ method: 'POST', url: `/api/restaurant/${restaurant._id}/menu`, data: body })
        toast.success('Item added!')
      }
      setItemForm(EMPTY_ITEM)
      setEditingItem(null)
      loadMenu(restaurant._id)
      setTab('menu')
    } catch (e) { toast.error(e.response?.data?.message || 'Error saving') }
    finally { setSaving(false) }
  }

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Delete this item?')) return
    try {
      await Axios({ method: 'DELETE', url: `/api/restaurant/menu/${itemId}` })
      toast.success('Item deleted')
      loadMenu(restaurant._id)
    } catch { toast.error('Failed to delete') }
  }

  const handleToggleAvail = async (item) => {
    try {
      await Axios({ method: 'PUT', url: `/api/restaurant/menu/${item._id}`, data: { isAvailable: !item.isAvailable } })
      toast.success(item.isAvailable ? 'Item hidden' : 'Item visible')
      loadMenu(restaurant._id)
    } catch { toast.error('Failed to update') }
  }

  const startEdit = (item) => {
    setEditingItem(item)
    setItemForm({
      name: item.name, description: item.description || '', image: item.image || '',
      price: item.price, discountedPrice: item.discountedPrice || 0,
      snapitMargin: item.snapitMargin || 0, category: item.category,
      isVeg: item.isVeg, isBestseller: item.isBestseller || false, isAvailable: item.isAvailable,
    })
    setTab('addItem')
  }

  const inp = 'w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-500 placeholder-slate-500'
  const lbl = 'text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block'

  if (!loading && !user?.restaurantId) {
    return (
      <div className='min-h-screen bg-slate-950 flex items-center justify-center p-6'>
        <div className='text-center'>
          <p className='text-4xl mb-3'>🍽️</p>
          <p className='font-black text-white text-lg'>No restaurant assigned</p>
          <p className='text-sm text-slate-500 mt-1'>Ask an admin to link your account to a restaurant.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-slate-950 flex items-center justify-center'>
        <p className='text-slate-500 text-sm'>Loading your restaurant...</p>
      </div>
    )
  }

  const grouped = menuItems.reduce((acc, item) => {
    acc[item.category] = acc[item.category] || []
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <div className='min-h-screen bg-slate-950 text-white'>

      {/* Header */}
      <div className='bg-slate-900 border-b border-slate-800 px-4 py-4'>
        <div className='flex items-center justify-between gap-3'>
          <div className='min-w-0'>
            <h1 className='text-lg font-black text-white truncate'>{restaurant?.name}</h1>
            <p className='text-xs text-slate-500 truncate'>{(restaurant?.cuisineTypes || []).join(' · ')}</p>
          </div>
          {/* FIX 1: flex-shrink-0 so the toggle button never squishes against the title */}
          <button onClick={handleToggleOpen}
            className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black border transition-all ${
              restaurant?.isOpen
                ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-green-500/10 hover:border-green-500/30 hover:text-green-400'
            }`}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${restaurant?.isOpen ? 'bg-green-400' : 'bg-red-400'}`}/>
            {restaurant?.isOpen ? 'OPEN' : 'CLOSED'}
          </button>
        </div>

        {/* Quick stats */}
        <div className='flex gap-4 mt-3'>
          <div className='text-center'>
            <p className='text-base font-black text-white'>{menuItems.length}</p>
            <p className='text-[9px] text-slate-500 uppercase font-bold'>Items</p>
          </div>
          <div className='text-center'>
            <p className='text-base font-black text-white'>{menuItems.filter(i => i.isAvailable).length}</p>
            <p className='text-[9px] text-slate-500 uppercase font-bold'>Available</p>
          </div>
          <div className='text-center'>
            <p className='text-base font-black text-white'>{Object.keys(grouped).length}</p>
            <p className='text-[9px] text-slate-500 uppercase font-bold'>Categories</p>
          </div>
          <div className='text-center'>
            <p className='text-base font-black text-orange-400'>★ {restaurant?.rating || '—'}</p>
            <p className='text-[9px] text-slate-500 uppercase font-bold'>Rating</p>
          </div>
        </div>
      </div>

      {/* FIX 2: flex-shrink-0 on tab buttons so they never collapse */}
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

            {menuItems.length === 0 && (
              <div className='bg-slate-900 rounded-3xl p-12 text-center border-2 border-dashed border-slate-700'>
                <p className='text-4xl mb-3'>🍽️</p>
                <p className='font-black text-white'>No menu items yet</p>
                <p className='text-sm text-slate-500 mt-1'>Add your first dish to get started.</p>
              </div>
            )}

            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} className='mb-6'>
                <p className='text-xs font-black text-slate-400 uppercase tracking-widest mb-2 border-l-2 border-orange-500 pl-2'>
                  {cat} · {items.length} items
                </p>
                <div className='flex flex-col gap-2'>
                  {items.map(item => (
                    <div key={item._id}
                      className={`bg-slate-900 border rounded-xl p-3 transition-opacity ${
                        item.isAvailable ? 'border-slate-800' : 'border-slate-700 opacity-50'
                      }`}>
                      {/* FIX 3: top row — image + info stacked, actions pinned below so nothing squishes */}
                      <div className='flex gap-3'>
                        <div className='w-14 h-14 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0'>
                          {item.image
                            ? <img src={item.image} alt={item.name} className='w-full h-full object-cover'/>
                            : <div className='w-full h-full flex items-center justify-center text-xl'>🍽️</div>
                          }
                        </div>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-1.5 flex-wrap'>
                            <span className={`w-3 h-3 border-2 rounded-sm flex-shrink-0 inline-flex items-center justify-center ${item.isVeg ? 'border-green-500' : 'border-red-500'}`}>
                              <span className={`block w-1 h-1 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`}/>
                            </span>
                            <p className='font-bold text-white text-sm truncate'>{item.name}</p>
                            {item.isBestseller && <span className='text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-black flex-shrink-0'>BS</span>}
                            {!item.isAvailable && <span className='text-[9px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-black flex-shrink-0'>HIDDEN</span>}
                          </div>
                          <div className='flex items-center gap-2 mt-0.5 flex-wrap'>
                            <p className='text-sm font-black text-white'>
                              ₹{item.discountedPrice > 0 ? item.discountedPrice : item.price}
                            </p>
                            {item.discountedPrice > 0 && item.discountedPrice < item.price && (
                              <p className='text-xs text-slate-500 line-through'>₹{item.price}</p>
                            )}
                            {item.snapitMargin > 0 && (
                              <span className='text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-black'>
                                +₹{item.snapitMargin} snapit
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Actions row: always on its own line — never competes with name for space */}
                      <div className='flex gap-1.5 mt-2 justify-end'>
                        <button onClick={() => startEdit(item)}
                          className='bg-sky-500/20 text-sky-400 text-[10px] font-black px-2 py-1 rounded-lg'>
                          Edit
                        </button>
                        <button onClick={() => handleToggleAvail(item)}
                          className='bg-slate-800 text-slate-400 text-[10px] font-black px-2 py-1 rounded-lg'>
                          {item.isAvailable ? 'Hide' : 'Show'}
                        </button>
                        <button onClick={() => handleDeleteItem(item._id)}
                          className='bg-red-500/20 text-red-400 text-[10px] font-black px-2 py-1 rounded-lg'>
                          Del
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ADD / EDIT ITEM ── */}
        {tab === 'addItem' && (
          <div className='flex flex-col gap-4 w-full max-w-lg'>
            <p className='font-black text-white text-base'>
              {editingItem ? '✏️ Edit Item' : '➕ Add Menu Item'}
            </p>

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

            {/* Image Upload */}
            <div>
              <label className={lbl}>Item Photo</label>
              <div className='flex items-center gap-3 mt-1'>
                {itemForm.image
                  ? <img src={itemForm.image} alt='preview' className='w-16 h-16 object-cover rounded-xl border border-slate-700'/>
                  : <div className='w-16 h-16 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center text-2xl'>🍽️</div>
                }
                <div className='flex flex-col gap-2 flex-1'>
                  <label className='cursor-pointer bg-slate-800 border border-slate-700 text-slate-300 text-xs font-black px-3 py-2 rounded-xl text-center hover:border-orange-500 transition'>
                    {uploadingImage ? '⏳ Uploading...' : '📷 Upload Photo'}
                    <input type='file' accept='image/*' className='hidden' onChange={e => handleImageUpload(e, 'image')} disabled={uploadingImage}/>
                  </label>
                  <input value={itemForm.image} onChange={e => setItemForm(p => ({ ...p, image: e.target.value }))}
                    placeholder='or paste image URL' className={inp + ' text-[10px]'}/>
                </div>
              </div>
            </div>

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

            {/* FIX 4: 2-col on mobile, 3-col on sm+ — Snapit Cut spans full width on mobile */}
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

            {/* FIX 5: price preview — 2×2 grid on mobile, single row on sm+ */}
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

            {/* Flags */}
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

        {/* ── ORDERS TAB ── */}
        {tab === 'orders' && (
          <div className='flex flex-col gap-3'>
            <p className='text-sm font-black text-white mb-2'>{orders.length} Orders</p>
            {ordersLoading && <p className='text-slate-500 text-xs'>Loading orders...</p>}
            {!ordersLoading && orders.length === 0 && (
              <div className='bg-slate-900 rounded-2xl p-8 text-center border border-slate-800'>
                <p className='text-2xl mb-2'>🛍️</p>
                <p className='text-slate-500 text-sm font-black'>No orders yet</p>
              </div>
            )}
            {orders.map(order => (
              <div key={order._id} className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                <div className='flex justify-between items-start mb-2'>
                  <div>
                    <p className='text-xs font-black text-orange-400'>{order.orderId}</p>
                    <p className='text-[10px] text-slate-500'>{new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                    order.delivery_status === 'Delivered' ? 'bg-emerald-500/15 text-emerald-400' :
                    order.delivery_status === 'Cancelled' ? 'bg-red-500/15 text-red-400' :
                    'bg-amber-500/15 text-amber-400'
                  }`}>{order.delivery_status}</span>
                </div>
                <div className='flex flex-col gap-1 mb-3'>
                  {(order.cartItems || []).map((item, i) => (
                    <div key={i} className='flex justify-between text-xs'>
                      <span className='text-slate-300'>{item.name || item.productId?.name} x{item.quantity}</span>
                      <span className='text-white font-black'>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className='flex justify-between items-center border-t border-slate-800 pt-2'>
                  <p className='text-sm font-black text-white'>₹{order.totalAmt || order.subTotalAmt}</p>
                  {order.delivery_status === 'Pending' && (
                    <div className='flex gap-2'>
                      <button onClick={() => handleUpdateOrderStatus(order._id, 'Preparing')}
                        className='text-[10px] font-black bg-orange-500 text-white px-3 py-1.5 rounded-lg'>
                        Accept
                      </button>
                      <button onClick={() => handleUpdateOrderStatus(order._id, 'Cancelled')}
                        className='text-[10px] font-black bg-red-500/15 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg'>
                        Reject
                      </button>
                    </div>
                  )}
                  {order.delivery_status === 'Preparing' && (
                    <button onClick={() => handleUpdateOrderStatus(order._id, 'Ready')}
                      className='text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg'>
                      Mark Ready
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── EARNINGS TAB ── */}
        {tab === 'earnings' && (
          <div className='flex flex-col gap-4'>
            {(() => {
              const delivered = orders.filter(o => o.delivery_status === 'Delivered')
              const total = delivered.reduce((a, o) => a + (o.totalAmt || o.subTotalAmt || 0), 0)
              const snapitCut = delivered.reduce((a, o) => a + ((o.cartItems || []).reduce((b, i) => b + (i.snapitMargin || 0) * (i.quantity || 1), 0)), 0)
              const earned = total - snapitCut
              const today = delivered.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString())
              const todayTotal = today.reduce((a, o) => a + (o.totalAmt || o.subTotalAmt || 0), 0)
              return (
                <>
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                      <p className='text-[10px] text-slate-500 uppercase font-black'>Total Orders</p>
                      <p className='text-2xl font-black text-white mt-1'>{delivered.length}</p>
                    </div>
                    <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                      <p className='text-[10px] text-slate-500 uppercase font-black'>Today Sales</p>
                      <p className='text-2xl font-black text-emerald-400 mt-1'>₹{todayTotal}</p>
                    </div>
                    <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                      <p className='text-[10px] text-slate-500 uppercase font-black'>Total Sales</p>
                      <p className='text-2xl font-black text-white mt-1'>₹{total}</p>
                    </div>
                    <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                      <p className='text-[10px] text-slate-500 uppercase font-black'>Your Earnings</p>
                      <p className='text-2xl font-black text-orange-400 mt-1'>₹{earned}</p>
                    </div>
                  </div>
                  <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                    <p className='text-xs font-black text-slate-400 mb-3 uppercase'>Recent Delivered Orders</p>
                    {delivered.length === 0 && <p className='text-slate-500 text-xs'>No delivered orders yet</p>}
                    {delivered.slice(0, 10).map(order => (
                      <div key={order._id} className='flex justify-between items-center py-2 border-b border-slate-800 last:border-0'>
                        <div>
                          <p className='text-xs font-black text-white'>{order.orderId}</p>
                          <p className='text-[10px] text-slate-500'>{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                        <p className='text-sm font-black text-emerald-400'>₹{order.totalAmt || order.subTotalAmt}</p>
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}
          </div>
        )}

      </div>
    </div>
  )
}