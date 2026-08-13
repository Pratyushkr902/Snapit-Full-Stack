import React, { useEffect, useState, useCallback } from 'react'
import Axios from '../utils/Axios'
import toast from 'react-hot-toast'

const EMPTY_PRODUCT = {
  name: '', description: '', image: '', unit: '',
  sellerPrice: '', snapitMargin: 0, stock: 0, publish: true,
}

const STATUS_COLORS = {
  Pending:            'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  Confirmed:          'bg-blue-500/10 border-blue-500/30 text-blue-400',
  'Out for Delivery': 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  Delivered:          'bg-green-500/10 border-green-500/30 text-green-400',
  Cancelled:          'bg-red-500/10 border-red-500/30 text-red-400',
}

const fmtINR = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// ── Reusable image upload field ─────────────────────────────────────────────
function ImageUploadField({ value, onChange, uploading, onFileChange }) {
  const inp = 'w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500 placeholder-slate-500'
  return (
    <div>
      <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1'>Photo</p>
      <div className='flex gap-3 items-start'>
        <div className='w-20 h-20 rounded-xl bg-slate-800 border border-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center'>
          {value ? <img src={value} alt='preview' className='w-full h-full object-cover'/> : <span className='text-2xl'>🛒</span>}
        </div>
        <div className='flex-1 flex flex-col gap-2'>
          <label className='cursor-pointer bg-slate-800 border border-slate-700 hover:border-emerald-500 text-slate-300 text-xs font-black py-2.5 px-3 rounded-xl text-center transition-all'>
            {uploading ? '⏳ Uploading…' : '📷 Upload Photo'}
            <input type='file' accept='image/*' className='hidden' onChange={onFileChange} disabled={uploading}/>
          </label>
          <input value={value} onChange={e => onChange(e.target.value)}
            placeholder='or paste image URL' className={inp + ' text-[11px]'}/>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, accent = 'text-white' }) {
  return (
    <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center'>
      <p className='text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1'>{label}</p>
      <p className={`text-lg font-black ${accent}`}>{value}</p>
    </div>
  )
}

export default function AdminSellerStorePanel() {
  const [sellers, setSellers]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [selectedSeller, setSelectedSeller] = useState(null)
  const [tab, setTab]                   = useState('products')

  const [products, setProducts]         = useState([])
  const [orders, setOrders]             = useState([])
  const [earnings, setEarnings]         = useState(null)
  const [tabLoading, setTabLoading]     = useState(false)

  const [productForm, setProductForm]   = useState(EMPTY_PRODUCT)
  const [editingProduct, setEditingProduct] = useState(null)
  const [saving, setSaving]             = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [storeSearch, setStoreSearch]   = useState('')
  const [deletingId, setDeletingId]     = useState(null)

  const inp   = 'w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500 placeholder-slate-500'
  const label = 'text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1'

  useEffect(() => { loadSellers() }, [])
  useEffect(() => {
    if (!selectedSeller) return
    if (tab === 'products') loadProducts(selectedSeller._id)
    if (tab === 'orders')   loadOrders(selectedSeller._id)
    if (tab === 'earnings') loadEarnings(selectedSeller._id)
  }, [selectedSeller, tab])

  const loadSellers = async () => {
    try {
      setLoading(true)
      const res = await Axios({ method: 'GET', url: '/api/admin/sellers' })
      if (res.data?.success) setSellers(res.data.data)
    } catch { toast.error('Failed to load stores') }
    finally { setLoading(false) }
  }

  const loadProducts = async (sellerId) => {
    setTabLoading(true)
    try {
      const res = await Axios({ method: 'GET', url: `/api/admin/sellers/${sellerId}/products` })
      if (res.data?.success) setProducts(res.data.data)
    } catch { toast.error('Failed to load products') }
    finally { setTabLoading(false) }
  }

  const loadOrders = async (sellerId) => {
    setTabLoading(true)
    try {
      const res = await Axios({ method: 'GET', url: `/api/admin/sellers/${sellerId}/orders` })
      if (res.data?.success) setOrders(res.data.data)
    } catch { toast.error('Failed to load orders') }
    finally { setTabLoading(false) }
  }

  const loadEarnings = async (sellerId) => {
    setTabLoading(true)
    try {
      const res = await Axios({ method: 'GET', url: `/api/admin/sellers/${sellerId}/earnings` })
      if (res.data?.success) setEarnings(res.data.data)
    } catch { toast.error('Failed to load earnings') }
    finally { setTabLoading(false) }
  }

  const openSeller = (seller) => {
    setSelectedSeller(seller)
    setTab('products')
    setProducts([]); setOrders([]); setEarnings(null)
    setEditingProduct(null); setProductForm(EMPTY_PRODUCT)
  }

  const backToStores = () => {
    setSelectedSeller(null)
    setEditingProduct(null); setProductForm(EMPTY_PRODUCT)
    loadSellers()
  }

  const uploadImage = async (file) => {
    setUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await Axios({ method: 'POST', url: '/api/file/upload-r2', data: fd })
      return res.data?.data?.url || res.data?.data?.secure_url || res.data?.secure_url || null
    } catch { toast.error('Image upload failed'); return null }
    finally { setUploadingImage(false) }
  }

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadImage(file)
    if (url) setProductForm(p => ({ ...p, image: url }))
  }

  const handleEditProduct = (p) => {
    setEditingProduct(p)
    const myStock = p.store_inventory?.find(inv => inv.sellerId?.toString() === selectedSeller._id)?.stock ?? p.stock ?? 0
    setProductForm({
      name: p.name || '', description: p.description || '', image: p.image?.[0] || '',
      unit: p.unit || '', sellerPrice: p.sellerPrice ?? '', snapitMargin: p.snapitMargin ?? 0,
      stock: myStock, publish: p.publish ?? true,
    })
    setTab('addProduct')
  }

  const handleSaveProduct = async () => {
    if (!productForm.name.trim() || productForm.sellerPrice === '') {
      toast.error('Name and price are required')
      return
    }
    setSaving(true)
    try {
      const body = {
        name: productForm.name.trim(),
        description: productForm.description,
        image: productForm.image ? [productForm.image] : [],
        unit: productForm.unit,
        sellerPrice: Number(productForm.sellerPrice),
        snapitMargin: Number(productForm.snapitMargin) || 0,
        stock: Number(productForm.stock) || 0,
        publish: productForm.publish,
      }
      if (editingProduct) {
        await Axios({ method: 'PUT', url: `/api/admin/sellers/${selectedSeller._id}/products/${editingProduct._id}`, data: body })
        toast.success('Product updated')
      } else {
        await Axios({ method: 'POST', url: `/api/admin/sellers/${selectedSeller._id}/products`, data: body })
        toast.success('Product added')
      }
      setProductForm(EMPTY_PRODUCT); setEditingProduct(null); setTab('products')
      loadProducts(selectedSeller._id)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save product')
    } finally { setSaving(false) }
  }

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Remove "${product.name}" from ${selectedSeller.store_name}?`)) return
    setDeletingId(product._id)
    try {
      await Axios({ method: 'DELETE', url: `/api/admin/sellers/${selectedSeller._id}/products/${product._id}` })
      toast.success('Product removed')
      setProducts(prev => prev.filter(p => p._id !== product._id))
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to remove product')
    } finally { setDeletingId(null) }
  }

  const filteredSellers = storeSearch.trim()
    ? sellers.filter(s =>
        (s.store_name || '').toLowerCase().includes(storeSearch.toLowerCase()) ||
        (s.name || '').toLowerCase().includes(storeSearch.toLowerCase()))
    : sellers

  const filteredProducts = productSearch.trim()
    ? products.filter(p => (p.name || '').toLowerCase().includes(productSearch.toLowerCase()))
    : products

  if (loading) return (
    <div className='min-h-screen bg-slate-950 flex items-center justify-center'>
      <p className='text-slate-400 font-black text-sm animate-pulse'>Loading…</p>
    </div>
  )

  return (
    <div className='min-h-screen bg-slate-950 text-white'>

      {/* ── Header ── */}
      <div className='bg-slate-900 border-b border-slate-800 px-4 py-4'>
        <div className='flex items-center justify-between'>
          <div>
            <p className='font-black text-white text-base'>🏪 Store Panel</p>
            {selectedSeller && <p className='text-[10px] text-emerald-400 mt-0.5'>{selectedSeller.store_name}</p>}
          </div>
          {selectedSeller && (
            <button onClick={backToStores}
              className='text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg font-black'>
              ← All Stores
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs (only once a store is selected) ── */}
      {selectedSeller && (
        <div className='bg-slate-900 border-b border-slate-800 flex overflow-x-auto scrollbar-none'>
          {[
            { key: 'products',    label: '📦 Products' },
            { key: 'addProduct',  label: editingProduct ? '✏️ Edit Product' : '➕ Add Product' },
            { key: 'orders',      label: '🛍️ Orders' },
            { key: 'earnings',    label: '💰 Earnings' },
          ].map(t => (
            <button key={t.key} onClick={() => { if (t.key !== 'addProduct') setEditingProduct(null); setTab(t.key) }}
              className={`flex-shrink-0 px-5 py-3 text-xs font-black whitespace-nowrap border-b-2 transition-all ${
                tab === t.key ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className='p-4'>

        {/* ── STORE LIST ── */}
        {!selectedSeller && (
          <div>
            <div className='flex justify-between items-center mb-4 gap-3'>
              <p className='text-sm font-black text-white'>{sellers.length} Stores</p>
              <input
                value={storeSearch}
                onChange={e => setStoreSearch(e.target.value)}
                placeholder='Search stores…'
                className={inp + ' max-w-xs'}
              />
            </div>

            {filteredSellers.length === 0 ? (
              <div className='bg-slate-900 rounded-3xl p-12 text-center border-2 border-dashed border-slate-700'>
                <p className='text-4xl mb-3'>🏪</p>
                <p className='text-white font-black mb-1'>No stores found</p>
              </div>
            ) : (
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
                {filteredSellers.map(s => (
                  <div key={s._id} onClick={() => openSeller(s)}
                    className='bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 cursor-pointer transition-all'>
                    <div className='flex items-start justify-between mb-2'>
                      <div className='w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-lg flex-shrink-0'>🏪</div>
                      <span className='text-[10px] font-black bg-slate-800 text-slate-400 px-2 py-1 rounded-full'>#{s.rank}</span>
                    </div>
                    <p className='font-black text-white text-sm truncate'>{s.store_name || 'Unnamed Store'}</p>
                    <p className='text-[10px] text-slate-500 truncate'>{s.name} · {s.email}</p>
                    <div className='flex items-center justify-between mt-3 pt-3 border-t border-slate-800'>
                      <div>
                        <p className='text-[9px] font-black text-slate-500 uppercase'>Revenue</p>
                        <p className='text-sm font-black text-emerald-400'>{fmtINR(s.stats?.totalRevenue)}</p>
                      </div>
                      <div className='text-right'>
                        <p className='text-[9px] font-black text-slate-500 uppercase'>Orders</p>
                        <p className='text-sm font-black text-white'>{s.stats?.totalOrders || 0}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PRODUCTS ── */}
        {selectedSeller && tab === 'products' && (
          <div>
            <div className='flex justify-between items-center mb-4 gap-3'>
              <input
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                placeholder='Search products…'
                className={inp + ' max-w-xs'}
              />
              <button onClick={() => { setEditingProduct(null); setProductForm(EMPTY_PRODUCT); setTab('addProduct') }}
                className='bg-emerald-500 text-white text-xs font-black px-3 py-2 rounded-xl whitespace-nowrap'>
                + Add Product
              </button>
            </div>

            {tabLoading ? (
              <p className='text-slate-500 text-sm text-center py-10'>Loading…</p>
            ) : filteredProducts.length === 0 ? (
              <div className='bg-slate-900 rounded-3xl p-12 text-center border-2 border-dashed border-slate-700'>
                <p className='text-4xl mb-3'>📦</p>
                <p className='text-white font-black mb-1'>No products yet</p>
              </div>
            ) : (
              <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'>
                {filteredProducts.map(p => {
                  const myStock = p.store_inventory?.find(inv => inv.sellerId?.toString() === selectedSeller._id)?.stock ?? p.stock ?? 0
                  return (
                    <div key={p._id} className='bg-slate-900 border border-slate-800 rounded-2xl p-3'>
                      <div className='w-full h-24 rounded-xl bg-slate-800 overflow-hidden flex items-center justify-center mb-2'>
                        {p.image?.[0] ? <img src={p.image[0]} alt={p.name} className='w-full h-full object-cover'/> : <span className='text-2xl'>📦</span>}
                      </div>
                      <p className='font-black text-white text-xs truncate'>{p.name}</p>
                      <p className='text-[10px] text-slate-500'>{fmtINR(p.sellingPrice ?? p.sellerPrice)} · Stock {myStock}</p>
                      <span className={`inline-block mt-1 text-[9px] font-black px-2 py-0.5 rounded-full ${p.publish ? 'bg-green-500/10 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                        {p.publish ? 'Published' : 'Hidden'}
                      </span>
                      <div className='flex gap-2 mt-2'>
                        <button onClick={() => handleEditProduct(p)}
                          className='flex-1 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black py-1.5 rounded-lg'>
                          Edit
                        </button>
                        <button onClick={() => handleDeleteProduct(p)} disabled={deletingId === p._id}
                          className='flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-black py-1.5 rounded-lg disabled:opacity-50'>
                          {deletingId === p._id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ADD / EDIT PRODUCT ── */}
        {selectedSeller && tab === 'addProduct' && (
          <div className='max-w-lg space-y-3'>
            <div>
              <p className={label}>Name</p>
              <input className={inp} value={productForm.name}
                onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))} placeholder='Product name'/>
            </div>
            <div>
              <p className={label}>Description</p>
              <textarea className={inp} rows={2} value={productForm.description}
                onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))} placeholder='Short description'/>
            </div>
            <ImageUploadField value={productForm.image} uploading={uploadingImage}
              onChange={url => setProductForm(p => ({ ...p, image: url }))} onFileChange={handleImageFile}/>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <p className={label}>Unit (e.g. 500g)</p>
                <input className={inp} value={productForm.unit}
                  onChange={e => setProductForm(p => ({ ...p, unit: e.target.value }))} placeholder='1 kg'/>
              </div>
              <div>
                <p className={label}>Stock</p>
                <input type='number' className={inp} value={productForm.stock}
                  onChange={e => setProductForm(p => ({ ...p, stock: e.target.value }))} placeholder='0'/>
              </div>
              <div>
                <p className={label}>Seller Price (₹)</p>
                <input type='number' className={inp} value={productForm.sellerPrice}
                  onChange={e => setProductForm(p => ({ ...p, sellerPrice: e.target.value }))} placeholder='0'/>
              </div>
              <div>
                <p className={label}>Snapit Margin (₹)</p>
                <input type='number' className={inp} value={productForm.snapitMargin}
                  onChange={e => setProductForm(p => ({ ...p, snapitMargin: e.target.value }))} placeholder='0'/>
              </div>
            </div>
            <label className='flex items-center gap-2 text-xs font-black text-slate-300'>
              <input type='checkbox' checked={productForm.publish}
                onChange={e => setProductForm(p => ({ ...p, publish: e.target.checked }))}/>
              Published (visible to customers)
            </label>
            <div className='flex gap-2 pt-2'>
              <button onClick={() => { setEditingProduct(null); setProductForm(EMPTY_PRODUCT); setTab('products') }}
                className='flex-1 border border-slate-700 text-slate-300 rounded-xl py-2.5 text-sm font-black'>
                Cancel
              </button>
              <button onClick={handleSaveProduct} disabled={saving}
                className='flex-1 bg-emerald-500 text-white rounded-xl py-2.5 text-sm font-black disabled:opacity-50'>
                {saving ? 'Saving…' : editingProduct ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        )}

        {/* ── ORDERS ── */}
        {selectedSeller && tab === 'orders' && (
          <div className='space-y-3'>
            {tabLoading ? (
              <p className='text-slate-500 text-sm text-center py-10'>Loading…</p>
            ) : orders.length === 0 ? (
              <div className='bg-slate-900 rounded-3xl p-12 text-center border-2 border-dashed border-slate-700'>
                <p className='text-4xl mb-3'>🛍️</p>
                <p className='text-white font-black mb-1'>No orders yet</p>
              </div>
            ) : orders.map(o => (
              <div key={o._id} className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                <div className='flex items-start justify-between gap-2 mb-2'>
                  <div>
                    <p className='text-xs font-black text-white'>{o.orderId}</p>
                    <p className='text-[10px] text-slate-500 mt-0.5'>
                      {o.customer?.name || 'Customer'} · {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${STATUS_COLORS[o.delivery_status] || 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    {o.delivery_status || 'Pending'}
                  </span>
                </div>
                <div className='flex flex-col gap-1 mb-2'>
                  {(o.sellerItems || []).map((it, i) => (
                    <div key={i} className='flex justify-between text-xs text-slate-400'>
                      <span>{it.name} × {it.quantity}</span>
                      <span>{fmtINR((it.sellerPrice || 0) * it.quantity)}</span>
                    </div>
                  ))}
                </div>
                {o.seller_status && (
                  <span className='text-[9px] font-black text-slate-500 uppercase'>Store status: {o.seller_status}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── EARNINGS ── */}
        {selectedSeller && tab === 'earnings' && (
          tabLoading ? (
            <p className='text-slate-500 text-sm text-center py-10'>Loading…</p>
          ) : earnings ? (
            <div className='grid grid-cols-2 gap-3'>
              <StatCard label='Total Orders' value={earnings.totalOrders} />
              <StatCard label='Items Sold' value={earnings.itemsSold} />
              <StatCard label='Seller Earning' value={fmtINR(earnings.sellerEarning)} accent='text-emerald-400' />
              <StatCard label='Snapit Margin' value={fmtINR(earnings.snapitMargin)} accent='text-blue-400' />
            </div>
          ) : null
        )}

      </div>
    </div>
  )
}