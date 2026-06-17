import React, { useEffect, useState, useMemo } from 'react'
import Axios from '../utils/Axios'
import toast from 'react-hot-toast'

const EMPTY_RESTO = { name:'', description:'', image:'', cuisineTypes:'', deliveryTimeMin:20, deliveryTimeMax:40, deliveryFee:0, minOrderValue:0, isPureVeg:false, isOpen:true, offers:'' }
const EMPTY_ITEM  = { name:'', description:'', image:'', price:'', discountedPrice:'', snapitMargin:0, category:'', isVeg:true, isBestseller:false, isAvailable:true }

const fmt = (n) => `₹${Number(n || 0).toFixed(0)}`

const STATUS_COLORS = {
  Pending:           'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  Confirmed:         'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Out for Delivery':'bg-purple-500/15 text-purple-400 border-purple-500/30',
  Delivered:         'bg-green-500/15 text-green-400 border-green-500/30',
  Cancelled:         'bg-red-500/15 text-red-400 border-red-500/30',
}

const MODE_COLORS = {
  COD:    'bg-orange-500/15 text-orange-400',
  ONLINE: 'bg-sky-500/15 text-sky-400',
  WALLET: 'bg-violet-500/15 text-violet-400',
}

// Shared helper so the order row + earnings aggregate never drift apart.
// Snapit's earning is margin + delivery fee, MINUS any discount/promo/wallet
// used — the seller is always paid their full sellerPrice regardless of the
// discount, so the discount cost comes out of Snapit's cut, not the seller's.
function computeOrderEconomics(order) {
  const itemMargin = (order.cartItems || []).reduce(
    (s, i) => s + (Number(i.snapitMargin || 0) * Number(i.quantity || 1)), 0
  )
  const sellerEarning = (order.cartItems || []).reduce(
    (s, i) => s + (Number(i.sellerPrice || 0) * Number(i.quantity || 1)), 0
  )
  const deliveryFee = Number(order.delivery_fee || 0)
  const discount = Number(order.discount_amount || 0) + Number(order.walletAmountUsed || 0)
  const snapitGross = itemMargin + deliveryFee
  const snapitNet = snapitGross - discount

  return { itemMargin, sellerEarning, deliveryFee, discount, snapitGross, snapitEarning: snapitNet }
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent = 'text-white' }) {
  return (
    <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
      <p className='text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1'>{label}</p>
      <p className={`text-2xl font-black ${accent}`}>{value}</p>
      {sub && <p className='text-[11px] text-slate-500 mt-0.5'>{sub}</p>}
    </div>
  )
}

// ── Order row (used inside the Orders & Earnings tab) ───────────────────────
function OrderRow({ order, onStatusChange }) {
  const [open, setOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  const { sellerEarning, discount, snapitGross, snapitEarning } = useMemo(
    () => computeOrderEconomics(order), [order]
  )

  const handleStatus = async (status) => {
    setUpdating(true)
    try {
      await Axios({ method: 'PUT', url: `/api/order/update-status/${order._id}`, data: { delivery_status: status } })
      onStatusChange(order._id, status)
    } catch { /* silent */ }
    finally { setUpdating(false) }
  }

  return (
    <div className='bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden'>
      <button onClick={() => setOpen(o => !o)} className='w-full text-left p-4'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <p className='text-xs font-black text-slate-400'>{order.orderId}</p>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.delivery_status] || 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                {order.delivery_status}
              </span>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${MODE_COLORS[order.payment_mode] || 'bg-slate-800 text-slate-400'}`}>
                {order.payment_mode || 'N/A'}
              </span>
            </div>
            <p className='text-white font-black text-base mt-1'>{order.store_details?.name || '—'}</p>
            <p className='text-[11px] text-slate-500 mt-0.5'>
              {new Date(order.createdAt).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
              {' · '}{order.cartItems?.length || 0} item{order.cartItems?.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className='text-right flex-shrink-0'>
            <p className='text-lg font-black text-white'>{fmt(order.totalAmt)}</p>
            <p className={`text-[10px] font-black ${snapitEarning < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {snapitEarning < 0 ? '−' : '+'}{fmt(Math.abs(snapitEarning))} snapit
            </p>
            <p className='text-[10px] text-slate-500 mt-0.5'>{open ? '▲' : '▼'}</p>
          </div>
        </div>
      </button>

      {open && (
        <div className='border-t border-slate-800 p-4 flex flex-col gap-4'>

          <div>
            <p className='text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2'>Items</p>
            <div className='flex flex-col gap-1.5'>
              {(order.cartItems || []).map((item, i) => (
                <div key={i} className='flex items-center justify-between gap-2 text-sm'>
                  <div className='flex items-center gap-2 min-w-0'>
                    {item.image
                      ? <img src={item.image} alt={item.name} className='w-8 h-8 rounded-lg object-cover flex-shrink-0 bg-slate-800'/>
                      : <div className='w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-base flex-shrink-0'>🍽️</div>
                    }
                    <div className='min-w-0'>
                      <p className='text-white font-bold text-xs truncate'>{item.name}</p>
                      <p className='text-[10px] text-slate-500'>×{item.quantity}</p>
                    </div>
                  </div>
                  <div className='text-right flex-shrink-0'>
                    <p className='text-xs font-black text-white'>{fmt(item.price * item.quantity)}</p>
                    {item.snapitMargin > 0 && (
                      <p className='text-[10px] text-emerald-400'>+{fmt(item.snapitMargin * item.quantity)} margin</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className='bg-slate-800/60 rounded-xl p-3'>
            <p className='text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2'>Earnings Breakdown</p>
            <div className='flex flex-col gap-1 text-xs'>
              <div className='flex justify-between'>
                <span className='text-slate-400'>Subtotal</span>
                <span className='text-white font-bold'>{fmt(order.subTotalAmt)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-slate-400'>Delivery fee</span>
                <span className='text-white font-bold'>{fmt(order.delivery_fee)}</span>
              </div>
              {order.tip > 0 && (
                <div className='flex justify-between'>
                  <span className='text-slate-400'>Tip</span>
                  <span className='text-white font-bold'>{fmt(order.tip)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className='flex justify-between'>
                  <span className='text-red-400'>Discount / Wallet</span>
                  <span className='text-red-400 font-bold'>−{fmt(discount)}</span>
                </div>
              )}
              {order.coupon_used && (
                <div className='flex justify-between'>
                  <span className='text-slate-500'>Coupon</span>
                  <span className='text-orange-400 font-bold'>{order.coupon_used}</span>
                </div>
              )}
              <div className='border-t border-slate-700 my-1'/>
              <div className='flex justify-between'>
                <span className='text-slate-300 font-black'>Customer Paid</span>
                <span className='text-white font-black'>{fmt(order.totalAmt)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-slate-400'>Seller earns</span>
                <span className='text-sky-400 font-bold'>{fmt(sellerEarning)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-slate-400'>Snapit margin (gross)</span>
                <span className='text-slate-300 font-bold'>{fmt(snapitGross)}</span>
              </div>
              {discount > 0 && (
                <div className='flex justify-between'>
                  <span className='text-slate-400 pl-2'>− discount/promo absorbed</span>
                  <span className='text-red-400 font-bold'>−{fmt(discount)}</span>
                </div>
              )}
              <div className='flex justify-between'>
                <span className='text-slate-300 font-black'>Snapit earns (net)</span>
                <span className={`font-black ${snapitEarning < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {snapitEarning < 0 ? '−' : ''}{fmt(Math.abs(snapitEarning))}
                </span>
              </div>
            </div>
          </div>

          <div>
            <p className='text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2'>Update Status</p>
            <div className='flex gap-2 flex-wrap'>
              {['Pending','Confirmed','Out for Delivery','Delivered','Cancelled'].map(s => (
                <button key={s} disabled={updating || order.delivery_status === s}
                  onClick={() => handleStatus(s)}
                  className={`text-[10px] font-black px-3 py-1.5 rounded-lg border transition-all disabled:opacity-40 ${
                    order.delivery_status === s
                      ? (STATUS_COLORS[s] || 'bg-slate-700 text-slate-300 border-slate-600')
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Orders & Earnings tab content ───────────────────────────────────────────
function OrdersEarningsTab({ restaurants }) {
  const [orders, setOrders]             = useState([])
  const [ordersLoaded, setOrdersLoaded] = useState(false)
  const [loading, setLoading]           = useState(true)
  const [filterResto, setFilterResto]   = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterMode, setFilterMode]     = useState('all')
  const [subTab, setSubTab]             = useState('orders') // 'orders' | 'earnings'

  useEffect(() => {
    if (ordersLoaded) return
    Axios({ method: 'GET', url: '/api/order/admin/restaurant-orders' })
      .then(res => { if (res.data?.success) setOrders(res.data.data) })
      .catch(() => {})
      .finally(() => { setLoading(false); setOrdersLoaded(true) })
  }, [ordersLoaded])

  const handleStatusChange = (id, status) => {
    setOrders(prev => prev.map(o => o._id === id ? { ...o, delivery_status: status } : o))
  }

  const filtered = useMemo(() => orders.filter(o => {
    const restoMatch  = filterResto  === 'all' || o.store_details?.name === filterResto
    const statusMatch = filterStatus === 'all' || o.delivery_status === filterStatus
    const modeMatch   = filterMode   === 'all' || o.payment_mode === filterMode
    return restoMatch && statusMatch && modeMatch
  }), [orders, filterResto, filterStatus, filterMode])

  const earnings = useMemo(() => {
    const byResto = {}
    let totalSnapit = 0, totalSeller = 0, totalRevenue = 0, totalDiscount = 0

    orders.forEach(o => {
      if (o.delivery_status === 'Cancelled') return
      const restoName = o.store_details?.name || 'Unknown'
      if (!byResto[restoName]) byResto[restoName] = { orders: 0, revenue: 0, snapit: 0, seller: 0, discount: 0 }

      const { sellerEarning, discount, snapitEarning } = computeOrderEconomics(o)

      byResto[restoName].orders++
      byResto[restoName].revenue  += Number(o.totalAmt || 0)
      byResto[restoName].snapit   += snapitEarning
      byResto[restoName].seller   += sellerEarning
      byResto[restoName].discount += discount

      totalSnapit  += snapitEarning
      totalSeller  += sellerEarning
      totalRevenue += Number(o.totalAmt || 0)
      totalDiscount+= discount
    })

    return { byResto, totalSnapit, totalSeller, totalRevenue, totalDiscount }
  }, [orders])

  const activeOrders    = orders.filter(o => !['Delivered','Cancelled'].includes(o.delivery_status)).length
  const deliveredOrders = orders.filter(o => o.delivery_status === 'Delivered').length

  if (loading) return (
    <div className='py-20 text-center'>
      <p className='text-slate-500 text-sm animate-pulse'>Loading orders…</p>
    </div>
  )

  return (
    <div>
      {/* Top stats */}
      <div className='grid grid-cols-2 gap-3 mb-4'>
        <StatCard label='Total Revenue'   value={fmt(earnings.totalRevenue)}  accent='text-white'/>
        <StatCard label='Snapit Earnings' value={fmt(earnings.totalSnapit)}   sub='after discount/promo' accent='text-emerald-400'/>
        <StatCard label='Active Orders'   value={activeOrders}    sub='pending + confirmed + out'  accent='text-yellow-400'/>
        <StatCard label='Delivered'       value={deliveredOrders} sub={`of ${orders.length} total`} accent='text-green-400'/>
      </div>

      {/* Sub-tab bar: Orders | Earnings */}
      <div className='bg-slate-900 border border-slate-800 rounded-xl flex overflow-x-auto scrollbar-none mb-4'>
        {[{ key:'orders', label:'📋 Orders' }, { key:'earnings', label:'💰 Earnings' }].map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className={`flex-shrink-0 px-5 py-2.5 text-xs font-black whitespace-nowrap border-b-2 transition-all ${
              subTab === t.key ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'orders' && (
        <div className='flex flex-col gap-4'>
          <div className='flex flex-col gap-2'>
            <select value={filterResto} onChange={e => setFilterResto(e.target.value)}
              className='w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-orange-500'>
              <option value='all'>All Restaurants</option>
              {[...new Set(orders.map(o => o.store_details?.name).filter(Boolean))].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>

            <div className='flex gap-2'>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className='flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-orange-500'>
                <option value='all'>All Statuses</option>
                {['Pending','Confirmed','Out for Delivery','Delivered','Cancelled'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select value={filterMode} onChange={e => setFilterMode(e.target.value)}
                className='flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-orange-500'>
                <option value='all'>All Modes</option>
                {['COD','ONLINE','WALLET'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <p className='text-[11px] text-slate-500'>{filtered.length} order{filtered.length !== 1 ? 's' : ''} shown</p>
          </div>

          {filtered.length === 0 && (
            <div className='bg-slate-900 border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center'>
              <p className='text-3xl mb-2'>🍽️</p>
              <p className='font-black text-white'>No orders found</p>
              <p className='text-xs text-slate-500 mt-1'>Try changing the filters above.</p>
            </div>
          )}

          {filtered.map(order => (
            <OrderRow key={order._id} order={order} onStatusChange={handleStatusChange}/>
          ))}
        </div>
      )}

      {subTab === 'earnings' && (
        <div className='flex flex-col gap-4'>
          <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
            <p className='text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3'>Platform Summary (excl. cancelled)</p>
            <div className='flex flex-col gap-2 text-sm'>
              <div className='flex justify-between'>
                <span className='text-slate-400'>Gross Revenue</span>
                <span className='text-white font-black'>{fmt(earnings.totalRevenue)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-slate-400'>Total Discounts given</span>
                <span className='text-red-400 font-black'>−{fmt(earnings.totalDiscount)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-slate-400'>Net collected</span>
                <span className='text-white font-black'>{fmt(earnings.totalRevenue - earnings.totalDiscount)}</span>
              </div>
              <div className='border-t border-slate-800 my-1'/>
              <div className='flex justify-between'>
                <span className='text-sky-400'>Seller payouts</span>
                <span className='text-sky-400 font-black'>{fmt(earnings.totalSeller)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-emerald-400'>Snapit earnings (after discount)</span>
                <span className={`font-black ${earnings.totalSnapit < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {earnings.totalSnapit < 0 ? '−' : ''}{fmt(Math.abs(earnings.totalSnapit))}
                </span>
              </div>
            </div>
          </div>

          <p className='text-[10px] font-black text-slate-500 uppercase tracking-widest'>Per Restaurant</p>
          {Object.entries(earnings.byResto)
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .map(([name, data]) => (
              <div key={name} className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                <div className='flex items-center justify-between mb-3'>
                  <p className='font-black text-white text-sm truncate'>{name}</p>
                  <span className='text-[10px] text-slate-500 flex-shrink-0 ml-2'>{data.orders} order{data.orders !== 1 ? 's' : ''}</span>
                </div>
                <div className='grid grid-cols-2 gap-2'>
                  <div className='bg-slate-800 rounded-xl p-2.5 text-center'>
                    <p className='text-[9px] text-slate-500 uppercase font-black'>Revenue</p>
                    <p className='text-sm font-black text-white'>{fmt(data.revenue)}</p>
                  </div>
                  <div className='bg-slate-800 rounded-xl p-2.5 text-center'>
                    <p className='text-[9px] text-slate-500 uppercase font-black'>Discounts</p>
                    <p className='text-sm font-black text-red-400'>−{fmt(data.discount)}</p>
                  </div>
                  <div className='bg-slate-800 rounded-xl p-2.5 text-center'>
                    <p className='text-[9px] text-slate-500 uppercase font-black'>Seller Gets</p>
                    <p className='text-sm font-black text-sky-400'>{fmt(data.seller)}</p>
                  </div>
                  <div className='bg-slate-800 rounded-xl p-2.5 text-center'>
                    <p className='text-[9px] text-slate-500 uppercase font-black'>Snapit Gets (net)</p>
                    <p className={`text-sm font-black ${data.snapit < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {data.snapit < 0 ? '−' : ''}{fmt(Math.abs(data.snapit))}
                    </p>
                  </div>
                </div>
              </div>
            ))
          }

          {Object.keys(earnings.byResto).length === 0 && (
            <div className='bg-slate-900 border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center'>
              <p className='text-3xl mb-2'>💰</p>
              <p className='font-black text-white'>No earnings data yet</p>
              <p className='text-xs text-slate-500 mt-1'>Delivered orders will appear here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
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
        <p className='text-xs text-slate-500'>Manage restaurants, menus, orders & earnings</p>
      </div>

      {/* Top-level tab bar — Orders & Earnings added alongside catalog tabs */}
      <div className='bg-slate-900 border-b border-slate-800 flex overflow-x-auto scrollbar-none'>
        {[
          { key:'restaurants', label:'🏪 All Restaurants' },
          ...(selectedResto ? [{ key:'menu', label:`📋 ${selectedResto.name}` }] : []),
          { key:'addResto', label: editingResto ? '✏️ Edit Resto' : '➕ Add Resto' },
          ...(selectedResto ? [{ key:'addItem', label: editingItem ? '✏️ Edit Item' : '➕ Add Item' }] : []),
          { key:'orders', label:'💰 Orders & Earnings' },
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

        {/* ── ORDERS & EARNINGS ── */}
        {tab === 'orders' && <OrdersEarningsTab restaurants={restaurants} />}

      </div>
    </div>
  )
}