import React, { useEffect, useState, useCallback } from 'react';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { FaCloudUploadAlt } from 'react-icons/fa';
import { MdDelete, MdEdit, MdAdd, MdClose } from 'react-icons/md';
import { IoSearchOutline, IoRefreshOutline } from 'react-icons/io5';
import {
    HiOutlineShoppingBag, HiOutlineClipboardList, HiOutlineCurrencyRupee,
    HiOutlineCheckCircle, HiOutlineTruck,
} from 'react-icons/hi';

// ── Field getters (same contract as before, backend fields unchanged) ──
const getOrderAmount     = (o) => Number(o.totalAmt ?? o.total_amount ?? o.amount ?? o.subTotalAmt ?? 0);
const getDeliveryFee     = (o) => Number(o.delivery_fee ?? o.deliveryFee ?? o.delivery_charge ?? 0);
const getItemSellerPrice = (item) => Number(item.sellerPrice ?? item.seller_price ?? item.price ?? item.unit_price ?? 0);

const getSellerEarning = (order) =>
    (order.cartItems || []).reduce((acc, item) => acc + getItemSellerPrice(item) * (Number(item.quantity) || 1), 0);

const fmtINR = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const isDelivered = (o) => (o.delivery_status || '').trim().toLowerCase() === 'delivered';
const isCancelled = (o) => (o.delivery_status || '').trim().toLowerCase() === 'cancelled';

const STATUS_STYLE = {
    delivered:          { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Delivered' },
    'out for delivery': { bg: 'bg-blue-100',    text: 'text-blue-700',    label: 'Out for Delivery' },
    confirmed:          { bg: 'bg-violet-100',  text: 'text-violet-700',  label: 'Confirmed' },
    cancelled:          { bg: 'bg-red-100',     text: 'text-red-600',     label: 'Cancelled' },
    pending:            { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Pending' },
    packing:            { bg: 'bg-sky-100',     text: 'text-sky-700',     label: 'Packing' },
};
const statusStyle = (s) => STATUS_STYLE[(s || '').toLowerCase()] || STATUS_STYLE.pending;

// ══════════════════════════════════════════════════════════════
const SellerDashboard = () => {
    const [tab, setTab]             = useState('orders'); // orders | products | earnings
    const [allOrders, setAllOrders] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [orderFilter, setOrderFilter] = useState('active'); // active | delivered | cancelled

    const [products, setProducts]         = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [productSearch, setProductSearch]     = useState('');
    const [showAddProduct, setShowAddProduct]   = useState(false);
    const [editingProduct, setEditingProduct]   = useState(null); // product being edited, or null
    const [imageLoading, setImageLoading]       = useState(false);
    const [savingProduct, setSavingProduct]     = useState(false);
    const [form, setForm] = useState({ name: '', image: [], unit: '', stock: '', sellerPrice: '', snapitMargin: '' });

    const [earningFilter, setEarningFilter] = useState('today'); // today | week | month | all

    const userId = useSelector(state => state.user.user?._id ?? state.user?._id);

    // ── Fetchers ──
    const fetchOrders = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await Axios({ ...SummaryApi.getSellerOrders });
            if (res.data.success) setAllOrders(Array.isArray(res.data.data) ? res.data.data : []);
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to fetch orders');
        } finally { setLoading(false); }
    }, []);

    const fetchProducts = useCallback(async () => {
        setProductsLoading(true);
        try {
            const res = await Axios({ ...SummaryApi.getSellerProducts, data: { page: 1, limit: 1000 } });
            if (res.data.success) setProducts(Array.isArray(res.data.data) ? res.data.data : []);
        } catch { toast.error('Failed to fetch products'); }
        finally { setProductsLoading(false); }
    }, []);

    useEffect(() => {
        if (!userId) return;
        fetchOrders();
        fetchProducts();
        const iv = setInterval(() => fetchOrders(true), 30000);
        return () => clearInterval(iv);
    }, [userId, fetchOrders, fetchProducts]);

    // ── Order actions ──
    const markAsReady = async (orderId) => {
        try {
            const res = await Axios({ ...SummaryApi.updateSellerStatus, data: { orderId, sellerStatus: 'Ready for Pickup' } });
            if (res.data.success) { toast.success('Rider notified!'); fetchOrders(true); }
        } catch { toast.error('Failed to update order'); }
    };

    // ── Product actions ──
    const handleUploadImage = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        setImageLoading(true);
        try {
            const fd = new FormData(); fd.append('image', file);
            const res = await Axios({ ...SummaryApi.uploadImage, data: fd });
            const url = res.data?.data?.url;
            if (url) { setForm(p => ({ ...p, image: [...p.image, url] })); toast.success('Image uploaded'); }
        } catch { toast.error('Image upload failed'); }
        finally { setImageLoading(false); }
    };

    const openAddProduct = () => {
        setForm({ name: '', image: [], unit: '', stock: '', sellerPrice: '', snapitMargin: '' });
        setEditingProduct(null);
        setShowAddProduct(true);
    };

    const openEditProduct = (product) => {
        setForm({
            name: product.name || '',
            image: product.image || [],
            unit: product.unit || '',
            stock: product.stock ?? '',
            sellerPrice: product.sellerPrice ?? product.price ?? '',
            snapitMargin: product.snapitMargin ?? '',
        });
        setEditingProduct(product);
        setShowAddProduct(true);
    };

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        const sellerP = Number(form.sellerPrice) || 0;
        const margin  = Number(form.snapitMargin) || 0;
        setSavingProduct(true);
        try {
            if (editingProduct) {
                const res = await Axios({
                    ...SummaryApi.updateProductDetails,
                    data: {
                        _id: editingProduct._id,
                        name: form.name, unit: form.unit, image: form.image,
                        stock: Number(form.stock) || 0,
                        sellerPrice: sellerP, snapitMargin: margin,
                        sellingPrice: sellerP + margin, price: sellerP + margin,
                    },
                });
                if (res.data.success) { toast.success('Product updated'); setShowAddProduct(false); fetchProducts(); }
            } else {
                const res = await Axios({
                    ...SummaryApi.createProduct,
                    data: {
                        name: form.name, description: form.name, image: form.image, unit: form.unit,
                        stock: Number(form.stock) || 0,
                        sellerPrice: sellerP, snapitMargin: margin,
                        sellingPrice: sellerP + margin, price: sellerP + margin,
                        category: [], subCategory: [],
                    },
                });
                if (res.data.success) { toast.success('Product added'); setShowAddProduct(false); fetchProducts(); }
            }
        } catch { toast.error('Save failed'); }
        finally { setSavingProduct(false); }
    };

    const handleDeleteProduct = async (productId) => {
        if (!window.confirm('Delete this product?')) return;
        try {
            const res = await Axios({ ...SummaryApi.deleteProduct, data: { _id: productId } });
            if (res.data.success) { toast.success('Deleted'); fetchProducts(); }
        } catch { toast.error('Delete failed'); }
    };

    // ── Computed ──
    const now = new Date();
    const activeOrders = allOrders.filter(o =>
        o.seller_status !== 'Ready for Pickup' && !isDelivered(o) && !isCancelled(o)
    );
    const packingOrders = allOrders.filter(o => o.seller_status === 'Packing');
    const deliveredOrders = allOrders.filter(isDelivered);
    const cancelledOrders = allOrders.filter(isCancelled);

    const ordersToShow =
        orderFilter === 'active'    ? [...activeOrders, ...packingOrders] :
        orderFilter === 'delivered' ? deliveredOrders :
        cancelledOrders;

    const filterByPeriod = (list) => list.filter(o => {
        const d = new Date(o.createdAt);
        if (earningFilter === 'today') return d.toDateString() === now.toDateString();
        if (earningFilter === 'week')  { const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w; }
        if (earningFilter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        return true;
    });

    const earningsOrders = filterByPeriod(deliveredOrders);
    const totalEarning = earningsOrders.reduce((a, o) => a + getSellerEarning(o), 0);
    const allTimeEarning = deliveredOrders.reduce((a, o) => a + getSellerEarning(o), 0);

    const filteredProducts = products.filter(p =>
        !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
    );
    const outOfStock = products.filter(p => p.stock <= 0).length;

    const sellingPreview = Number(form.sellerPrice || 0) + Number(form.snapitMargin || 0);

    if (loading) return (
        <div className='min-h-screen bg-slate-950 flex items-center justify-center'>
            <div className='w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin' />
        </div>
    );

    return (
        <div className='min-h-screen bg-slate-950 text-white pb-20'>
            {/* Header */}
            <div className='sticky top-0 z-30 bg-slate-950 border-b border-slate-800 px-4 pt-3 pb-2 flex items-center justify-between'>
                <div>
                    <h1 className='text-lg font-black'>My Store</h1>
                    <p className='text-[10px] text-slate-500 font-bold uppercase tracking-widest'>Snapit Seller</p>
                </div>
                <button onClick={() => { fetchOrders(true); fetchProducts(); }}
                    className='w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 active:scale-90'>
                    <IoRefreshOutline size={18} />
                </button>
            </div>

            <div className='max-w-lg mx-auto px-4 py-4'>

                {/* ══════ ORDERS TAB ══════ */}
                {tab === 'orders' && (
                    <div className='flex flex-col gap-3'>
                        <div className='flex gap-2'>
                            {[
                                { key: 'active',    label: `Active (${activeOrders.length + packingOrders.length})` },
                                { key: 'delivered', label: 'Delivered' },
                                { key: 'cancelled', label: 'Cancelled' },
                            ].map(f => (
                                <button key={f.key} onClick={() => setOrderFilter(f.key)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                        orderFilter === f.key ? 'bg-orange-500 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700'
                                    }`}>{f.label}</button>
                            ))}
                        </div>

                        {ordersToShow.length === 0 ? (
                            <div className='bg-slate-900 border-2 border-dashed border-slate-700 rounded-3xl p-14 text-center'>
                                <HiOutlineCheckCircle size={32} className='text-emerald-400 mx-auto mb-3' />
                                <p className='font-black text-white'>No orders here</p>
                            </div>
                        ) : ordersToShow
                            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                            .map(order => {
                                const isPacking = order.seller_status === 'Packing';
                                const showAction = orderFilter === 'active';
                                return (
                                    <div key={order._id} className='bg-slate-900 rounded-2xl border border-slate-800 p-4'>
                                        <div className='flex justify-between items-start mb-2'>
                                            <div>
                                                <p className='font-mono text-sm font-black'>{order.orderId}</p>
                                                <p className='text-[10px] text-slate-500'>
                                                    {new Date(order.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-full ${statusStyle(isPacking ? 'packing' : order.delivery_status).bg} ${statusStyle(isPacking ? 'packing' : order.delivery_status).text}`}>
                                                {isPacking ? 'Packing' : statusStyle(order.delivery_status).label}
                                            </span>
                                        </div>
                                        <div className='text-xs text-slate-400 mb-2'>
                                            {(order.cartItems || []).map((i, idx) => (
                                                <span key={idx}>{i.productId?.name || i.name} ×{i.quantity}{idx < order.cartItems.length - 1 ? ', ' : ''}</span>
                                            ))}
                                        </div>
                                        <div className='flex justify-between items-center pt-2 border-t border-slate-800'>
                                            <p className='text-xs text-slate-500'>Your earning</p>
                                            <p className='text-sm font-black text-emerald-400'>{fmtINR(getSellerEarning(order))}</p>
                                        </div>
                                        {showAction && (
                                            <button onClick={() => markAsReady(order.orderId)}
                                                className='w-full mt-3 bg-orange-500 active:scale-95 text-white py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2'>
                                                <HiOutlineTruck size={16} /> Packed — Notify Rider
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                )}

                {/* ══════ PRODUCTS TAB ══════ */}
                {tab === 'products' && (
                    <div className='flex flex-col gap-3'>
                        <div className='flex gap-2'>
                            <div className='relative flex-1'>
                                <IoSearchOutline size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-500' />
                                <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                                    placeholder='Search products...'
                                    className='w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold text-slate-200 outline-none focus:border-orange-500 placeholder-slate-600' />
                            </div>
                            <button onClick={openAddProduct}
                                className='bg-orange-500 text-white w-11 h-11 rounded-xl flex items-center justify-center active:scale-90'>
                                <MdAdd size={22} />
                            </button>
                        </div>
                        <div className='bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex items-center justify-between'>
                            <div>
                                <p className='text-[10px] font-black text-slate-500 uppercase tracking-widest'>Total Products</p>
                                <p className='text-2xl font-black text-white mt-0.5'>{products.length}</p>
                            </div>
                            <HiOutlineShoppingBag size={28} className='text-orange-500/60' />
                        </div>

                        {outOfStock > 0 && (
                            <div className='bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-xs font-black text-red-400'>
                                {outOfStock} product{outOfStock > 1 ? 's' : ''} out of stock
                            </div>
                        )}

                        {productsLoading ? (
                            <div className='text-center py-10 text-slate-500 text-sm font-bold'>Loading...</div>
                        ) : filteredProducts.length === 0 ? (
                            <div className='bg-slate-900 border-2 border-dashed border-slate-700 rounded-3xl p-14 text-center'>
                                <p className='font-black text-white mb-3'>No products yet</p>
                                <button onClick={openAddProduct} className='bg-orange-500 text-white font-black text-sm px-5 py-2 rounded-xl'>
                                    Add Your First Product
                                </button>
                            </div>
                        ) : filteredProducts.map(product => {
                            const sellerP = Number(product.sellerPrice || product.price || 0);
                            const margin  = Number(product.snapitMargin || 0);
                            const mrp = sellerP + margin;
                            const out = product.stock <= 0;
                            return (
                                <div key={product._id} className={`bg-slate-900 rounded-2xl p-3 border flex gap-3 items-center ${out ? 'border-red-500/30' : 'border-slate-800'}`}>
                                    <img src={product.image?.[0] || ''} alt={product.name}
                                        className='w-14 h-14 object-contain rounded-xl bg-slate-800 border border-slate-700 flex-shrink-0' />
                                    <div className='flex-1 min-w-0'>
                                        <p className='font-bold text-sm text-white truncate'>{product.name}</p>
                                        <p className='text-[10px] text-slate-500'>{product.unit}</p>
                                        <div className='flex items-center gap-2 mt-1'>
                                            <span className='text-sm font-black text-emerald-400'>{fmtINR(mrp)}</span>
                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${out ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                                                {out ? 'Out of stock' : `${product.stock} in stock`}
                                            </span>
                                        </div>
                                    </div>
                                    <div className='flex flex-col gap-1.5'>
                                        <button onClick={() => openEditProduct(product)}
                                            className='w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center'>
                                            <MdEdit size={15} />
                                        </button>
                                        <button onClick={() => handleDeleteProduct(product._id)}
                                            className='w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center'>
                                            <MdDelete size={15} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ══════ EARNINGS TAB ══════ */}
                {tab === 'earnings' && (
                    <div className='flex flex-col gap-4'>
                        <div className='flex gap-2'>
                            {[{ key: 'today', label: 'Today' }, { key: 'week', label: 'Week' }, { key: 'month', label: 'Month' }, { key: 'all', label: 'All Time' }].map(f => (
                                <button key={f.key} onClick={() => setEarningFilter(f.key)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black ${earningFilter === f.key ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}>
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        <div className='bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6'>
                            <p className='text-[10px] font-black text-emerald-400/60 uppercase tracking-widest mb-1'>
                                {earningFilter === 'today' ? "Today's" : earningFilter === 'week' ? "This Week's" : earningFilter === 'month' ? "This Month's" : 'All-Time'} Earning
                            </p>
                            <p className='text-4xl font-black text-emerald-400'>{fmtINR(totalEarning)}</p>
                            <p className='text-[10px] text-slate-500 mt-1'>{earningsOrders.length} delivered order{earningsOrders.length !== 1 ? 's' : ''}</p>
                        </div>

                        <div className='grid grid-cols-2 gap-3'>
                            <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                <p className='text-[10px] font-black text-slate-500 uppercase'>All-Time Earning</p>
                                <p className='text-xl font-black text-white mt-1'>{fmtINR(allTimeEarning)}</p>
                            </div>
                            <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                <p className='text-[10px] font-black text-slate-500 uppercase'>Delivered Orders</p>
                                <p className='text-xl font-black text-white mt-1'>{deliveredOrders.length}</p>
                            </div>
                        </div>

                        <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                            <p className='text-xs font-black text-white uppercase tracking-wider mb-3'>Recent Payouts</p>
                            {earningsOrders.length === 0 ? (
                                <p className='text-sm text-slate-500 text-center py-6'>No delivered orders in this period</p>
                            ) : earningsOrders
                                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                .slice(0, 20)
                                .map(o => (
                                    <div key={o._id} className='flex justify-between items-center py-2.5 border-b border-slate-800 last:border-0'>
                                        <div>
                                            <p className='text-xs font-mono font-bold text-slate-300'>{o.orderId}</p>
                                            <p className='text-[10px] text-slate-500'>{new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                                        </div>
                                        <p className='text-sm font-black text-emerald-400'>{fmtINR(getSellerEarning(o))}</p>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ══════ Bottom Tab Bar (Zepto/Zomato style) ══════ */}
            <div className='fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex z-40'>
                {[
                    { key: 'orders',   icon: <HiOutlineClipboardList size={20} />, label: 'Orders' },
                    { key: 'products', icon: <HiOutlineShoppingBag size={20} />,   label: 'Products' },
                    { key: 'earnings', icon: <HiOutlineCurrencyRupee size={20} />, label: 'Earnings' },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 ${tab === t.key ? 'text-orange-500' : 'text-slate-500'}`}>
                        {t.icon}
                        <span className='text-[10px] font-black'>{t.label}</span>
                    </button>
                ))}
            </div>

            {/* ══════ Add/Edit Product Modal ══════ */}
            {showAddProduct && (
                <div className='fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center'>
                    <div className='bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto'>
                        <div className='sticky top-0 bg-slate-900 flex justify-between items-center px-5 py-4 border-b border-slate-800'>
                            <p className='font-black text-white'>{editingProduct ? 'Edit Product' : 'Add Product'}</p>
                            <button onClick={() => setShowAddProduct(false)} className='text-slate-500'><MdClose size={22} /></button>
                        </div>
                        <form onSubmit={handleSaveProduct} className='p-5 flex flex-col gap-4'>
                            <div>
                                <label className='text-[10px] font-black text-slate-500 uppercase'>Product Name *</label>
                                <input type='text' required value={form.name}
                                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                    className='mt-1.5 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500' />
                            </div>
                            <div>
                                <label className='text-[10px] font-black text-slate-500 uppercase'>Image</label>
                                <label htmlFor='sellerProdImg'
                                    className='mt-1.5 flex items-center justify-center h-20 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer'>
                                    {imageLoading ? <p className='text-xs text-slate-500'>Uploading...</p> :
                                        form.image[0] ? <img src={form.image[0]} className='h-16 object-contain' /> :
                                        <div className='text-center'><FaCloudUploadAlt size={20} className='text-slate-600 mx-auto' /><p className='text-[10px] text-slate-600 mt-1'>Tap to upload</p></div>}
                                    <input id='sellerProdImg' type='file' accept='image/*' className='hidden' onChange={handleUploadImage} />
                                </label>
                            </div>
                            <div className='grid grid-cols-2 gap-3'>
                                <div>
                                    <label className='text-[10px] font-black text-slate-500 uppercase'>Unit *</label>
                                    <input type='text' placeholder='1kg' required value={form.unit}
                                        onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                                        className='mt-1.5 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500' />
                                </div>
                                <div>
                                    <label className='text-[10px] font-black text-slate-500 uppercase'>Stock *</label>
                                    <input type='number' required value={form.stock}
                                        onChange={e => setForm(p => ({ ...p, stock: e.target.value }))}
                                        className='mt-1.5 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500' />
                                </div>
                            </div>
                            <div className='grid grid-cols-2 gap-3'>
                                <div>
                                    <label className='text-[10px] font-black text-slate-500 uppercase'>Your Price *</label>
                                    <input type='number' required value={form.sellerPrice}
                                        onChange={e => setForm(p => ({ ...p, sellerPrice: e.target.value }))}
                                        className='mt-1.5 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-emerald-500' />
                                </div>
                                <div>
                                    <label className='text-[10px] font-black text-slate-500 uppercase'>Snapit Margin</label>
                                    <input type='number' value={form.snapitMargin}
                                        onChange={e => setForm(p => ({ ...p, snapitMargin: e.target.value }))}
                                        className='mt-1.5 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-emerald-500' />
                                </div>
                            </div>
                            <div className='bg-slate-800 rounded-xl px-3 py-2.5 flex justify-between items-center'>
                                <p className='text-[10px] font-black text-slate-400 uppercase'>Customer Pays</p>
                                <p className='text-lg font-black text-emerald-400'>{fmtINR(sellingPreview)}</p>
                            </div>
                            <button type='submit' disabled={savingProduct}
                                className='w-full bg-orange-500 disabled:bg-slate-700 text-white py-3 rounded-2xl font-black text-sm active:scale-95'>
                                {savingProduct ? 'Saving...' : editingProduct ? 'Save Changes' : 'Add Product'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SellerDashboard;