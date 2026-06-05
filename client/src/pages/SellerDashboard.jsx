import React, { useEffect, useState, useRef } from 'react';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { FaCloudUploadAlt } from 'react-icons/fa';
import { MdDelete, MdEdit } from 'react-icons/md';
import { IoClose, IoSearchOutline, IoRefreshOutline } from 'react-icons/io5';
import {
    HiOutlineShoppingBag, HiOutlineCube, HiOutlineClipboardList,
    HiOutlineCurrencyRupee, HiOutlineTrendingUp, HiOutlineChartBar,
    HiOutlineTruck, HiOutlineCheckCircle, HiOutlineXCircle,
    HiOutlineClock, HiOutlineDownload, HiOutlineFilter,
} from 'react-icons/hi';

// ── Field getters ──────────────────────────────────────────────
const getOrderAmount   = (o) => Number(o.totalAmt ?? o.total_amount ?? o.amount ?? o.subTotalAmt ?? 0);
const getDeliveryFee   = (o) => Number(o.delivery_fee ?? o.deliveryFee ?? o.delivery_charge ?? 0);
const getItemSellerPrice = (item) => Number(item.sellerPrice ?? item.seller_price ?? item.price ?? item.unit_price ?? 0);
const getItemSnapitMargin = (item) => Number(item.snapitMargin ?? item.snapit_margin ?? 0);
const getSellerEarning = (order) =>
    (order.cartItems || []).reduce((acc, item) => acc + getItemSellerPrice(item) * (Number(item.quantity) || 1), 0);
const getSnapitEarning = (order) =>
    (order.cartItems || []).reduce((acc, item) => acc + getItemSnapitMargin(item) * (Number(item.quantity) || 1), 0);

// ── Formatters ─────────────────────────────────────────────────
const fmtINR = (n) =>
    `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtINRShort = (n) => {
    const num = Number(n);
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    if (num >= 1000)   return `₹${(num / 1000).toFixed(1)}K`;
    return `₹${num.toFixed(0)}`;
};

// ── Status helpers ─────────────────────────────────────────────
const isDelivered  = (o) => (o.delivery_status || '').trim().toLowerCase() === 'delivered';
const isCancelled  = (o) => (o.delivery_status || '').trim().toLowerCase() === 'cancelled';

const STATUS_CONFIG = {
    delivered:        { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Delivered' },
    'out for delivery': { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Out for Delivery' },
    confirmed:        { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500', label: 'Confirmed' },
    cancelled:        { bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-500', label: 'Cancelled' },
    pending:          { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Pending' },
    packing:          { bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-500', label: 'Packing' },
};

const getStatusConfig = (s) => STATUS_CONFIG[(s || '').toLowerCase()] || STATUS_CONFIG.pending;

// ── Mini components ────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const cfg = getStatusConfig(status);
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${cfg.bg} ${cfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
};

const StatCard = ({ label, value, sub, color = 'text-slate-900', bg = 'bg-white', border = 'border-slate-100', icon }) => (
    <div className={`${bg} rounded-2xl p-4 border ${border} flex flex-col gap-1 shadow-sm`}>
        {icon && <div className={`text-xl mb-1 ${color}`}>{icon}</div>}
        <p className='text-[10px] font-black text-slate-400 uppercase tracking-wider'>{label}</p>
        <p className={`text-2xl font-black ${color}`}>{value}</p>
        {sub && <p className='text-[10px] text-slate-400'>{sub}</p>}
    </div>
);

const ProgressBar = ({ pct, color = 'bg-emerald-500' }) => (
    <div className='w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden'>
        <div className={`${color} h-1.5 rounded-full transition-all duration-700`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
);

// ── Export CSV ─────────────────────────────────────────────────
const exportCSV = (orders) => {
    const rows = [
        ['Order ID', 'Date', 'Status', 'Items', 'Gross', 'Delivery', 'Sales (excl delivery)', 'Seller Earning', 'Snapit Cut'],
        ...orders.map(o => [
            o.orderId,
            new Date(o.createdAt).toLocaleDateString('en-IN'),
            o.delivery_status,
            (o.cartItems || []).map(i => `${i.productId?.name || i.name} ×${i.quantity}`).join('; '),
            getOrderAmount(o).toFixed(2),
            getDeliveryFee(o).toFixed(2),
            (getOrderAmount(o) - getDeliveryFee(o)).toFixed(2),
            getSellerEarning(o).toFixed(2),
            getSnapitEarning(o).toFixed(2),
        ])
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'store-orders.csv'; a.click();
    URL.revokeObjectURL(url);
};

// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
const SellerDashboard = () => {
    const [allOrders, setAllOrders]         = useState([]);
    const [activeTab, setActiveTab]         = useState('overview');
    const [earningFilter, setEarningFilter] = useState('all');
    const [loading, setLoading]             = useState(true);
    const [historySearch, setHistorySearch] = useState('');
    const [historyFilter, setHistoryFilter] = useState('all');
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [lastRefreshed, setLastRefreshed] = useState(new Date());

    // Products
    const [productTab, setProductTab]           = useState('list');
    const [products, setProducts]               = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [imageLoading, setImageLoading]       = useState(false);
    const [editingStock, setEditingStock]       = useState({});
    const [productSearch, setProductSearch]     = useState('');
    const [productForm, setProductForm]         = useState({
        name: '', description: '', image: [], category: [],
        subCategory: [], unit: '', stock: '', sellerPrice: '',
        snapitMargin: '', discount: '',
    });
    const [selectCategory, setSelectCategory]       = useState('');
    const [selectSubCategory, setSelectSubCategory] = useState('');

    const allCategory    = useSelector(state => state.product.allCategory);
    const allSubCategory = useSelector(state => state.product.allSubCategory);
    const sellingPrice   = Number(productForm.sellerPrice || 0) + Number(productForm.snapitMargin || 0);

    // ── Fetch ─────────────────────────────────────────────────
    const fetchOrders = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await Axios({ ...SummaryApi.getSellerOrders });
            if (res.data.success) {
                setAllOrders(Array.isArray(res.data.data) ? res.data.data : []);
                setLastRefreshed(new Date());
            }
        } catch { toast.error('Failed to fetch orders'); }
        finally { setLoading(false); }
    };

    const fetchProducts = async () => {
        setProductsLoading(true);
        try {
            const res = await Axios({ ...SummaryApi.getProduct, data: { page: 1, limit: 100 } });
            if (res.data.success) setProducts(Array.isArray(res.data.data) ? res.data.data : []);
        } catch { toast.error('Failed to fetch products'); }
        finally { setProductsLoading(false); }
    };

    const markAsReady = async (orderId) => {
        try {
            const res = await Axios({ ...SummaryApi.updateSellerStatus, data: { orderId, sellerStatus: 'Ready for Pickup' } });
            if (res.data.success) { toast.success('Rider Notified! Order ready for pickup.'); fetchOrders(true); }
        } catch { toast.error('Failed to update order'); }
    };

    const handleUploadImage = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        setImageLoading(true);
        try {
            const fd = new FormData(); fd.append('image', file);
            const res = await Axios({ ...SummaryApi.uploadImage, data: fd });
            const url = res.data?.data?.url;
            if (url) { setProductForm(p => ({ ...p, image: [...p.image, url] })); toast.success('Image uploaded!'); }
        } catch { toast.error('Image upload failed'); }
        finally { setImageLoading(false); }
    };

    const handleProductSubmit = async (e) => {
        e.preventDefault();
        const sellerP = Number(productForm.sellerPrice) || 0;
        const margin  = Number(productForm.snapitMargin) || 0;
        const payload = {
            ...productForm,
            category:     productForm.category.map(c => c._id),
            subCategory:  productForm.subCategory.map(s => s._id),
            sellerPrice:  sellerP, snapitMargin: margin,
            sellingPrice: sellerP + margin, price: sellerP + margin,
        };
        try {
            const res = await Axios({ ...SummaryApi.createProduct, data: payload });
            if (res.data.success) {
                toast.success('Product uploaded!');
                setProductForm({ name:'', description:'', image:[], category:[], subCategory:[], unit:'', stock:'', sellerPrice:'', snapitMargin:'', discount:'' });
                setProductTab('list'); fetchProducts();
            }
        } catch { toast.error('Failed to upload product'); }
    };

    const handleUpdateStock = async (productId) => {
        const newStock = editingStock[productId];
        if (newStock === undefined || newStock === '') return;
        try {
            const res = await Axios({ ...SummaryApi.updateProductDetails, data: { _id: productId, stock: Number(newStock) } });
            if (res.data.success) {
                toast.success('Stock updated!');
                setEditingStock(p => { const n = { ...p }; delete n[productId]; return n; });
                fetchProducts();
            }
        } catch { toast.error('Stock update failed'); }
    };

    const handleDeleteProduct = async (productId) => {
        if (!window.confirm('Delete this product?')) return;
        try {
            const res = await Axios({ ...SummaryApi.deleteProduct, data: { _id: productId } });
            if (res.data.success) { toast.success('Product deleted'); fetchProducts(); }
        } catch { toast.error('Delete failed'); }
    };

    useEffect(() => {
        fetchOrders();
        const iv = setInterval(() => fetchOrders(true), 30000);
        return () => clearInterval(iv);
    }, []);

    useEffect(() => { if (activeTab === 'products') fetchProducts(); }, [activeTab]);

    // ── Computed values ────────────────────────────────────────
    const now = new Date();

    const packingOrders = allOrders.filter(o =>
        o.seller_status !== 'Ready for Pickup' &&
        o.delivery_status !== 'Delivered' &&
        o.delivery_status !== 'Cancelled'
    );
    const pendingCount   = allOrders.filter(o => o.delivery_status === 'Pending' && o.seller_status !== 'Ready for Pickup').length;
    const packingCount   = allOrders.filter(o => o.seller_status === 'Packing').length;
    const deliveredCount = allOrders.filter(isDelivered).length;
    const cancelledCount = allOrders.filter(isCancelled).length;

    const filterByDate = (list) => list.filter(o => {
        if (!isDelivered(o)) return false;
        const d = new Date(o.createdAt);
        if (earningFilter === 'today') return d.toDateString() === now.toDateString();
        if (earningFilter === 'week')  { const w = new Date(now); w.setDate(now.getDate()-7); return d >= w; }
        if (earningFilter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        return true;
    });

    const filteredEarnings   = filterByDate(allOrders);
    const totalGross         = filteredEarnings.reduce((a, o) => a + getOrderAmount(o), 0);
    const totalDelivery      = filteredEarnings.reduce((a, o) => a + getDeliveryFee(o), 0);
    const totalSellerEarning = filteredEarnings.reduce((a, o) => a + getSellerEarning(o), 0);
    const totalSnapitEarning = filteredEarnings.reduce((a, o) => a + getSnapitEarning(o), 0);
    const totalOrders        = filteredEarnings.length;
    const avgNet             = totalOrders > 0 ? totalSellerEarning / totalOrders : 0;
    const totalSalesExDel    = filteredEarnings.reduce((a, o) => a + getOrderAmount(o) - getDeliveryFee(o), 0);

    const allTimeSales     = allOrders.filter(isDelivered).reduce((a, o) => a + getOrderAmount(o) - getDeliveryFee(o), 0);
    const allTimeEarning   = allOrders.filter(isDelivered).reduce((a, o) => a + getSellerEarning(o), 0);
    const allTimeDelivery  = allOrders.filter(isDelivered).reduce((a, o) => a + getDeliveryFee(o), 0);
    const queueEarning     = packingOrders.reduce((a, o) => a + getSellerEarning(o), 0);

    // Product earnings breakdown
    const productEarnings = filteredEarnings.reduce((acc, order) => {
        (order.cartItems || []).forEach(item => {
            const name = item.productId?.name || item.name || 'Unknown';
            const qty  = Number(item.quantity) || 1;
            const sp   = getItemSellerPrice(item);
            if (!acc[name]) acc[name] = { qty: 0, revenue: 0 };
            acc[name].qty += qty; acc[name].revenue += sp * qty;
        });
        return acc;
    }, {});
    const productList = Object.entries(productEarnings).sort((a, b) => b[1].revenue - a[1].revenue);

    // All-time product sells
    const allTimeProductSells = allOrders.filter(isDelivered).reduce((acc, order) => {
        (order.cartItems || []).forEach(item => {
            const name = item.productId?.name || item.name || 'Unknown';
            const qty  = Number(item.quantity) || 1;
            if (!acc[name]) acc[name] = 0;
            acc[name] += qty;
        });
        return acc;
    }, {});
    const topProducts = Object.entries(allTimeProductSells).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const byDate = filteredEarnings.reduce((acc, o) => {
        const d = new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        if (!acc[d]) acc[d] = { gross:0, sellerNet:0, snapit:0, delivery:0, salesExDel:0, count:0 };
        acc[d].gross      += getOrderAmount(o);
        acc[d].delivery   += getDeliveryFee(o);
        acc[d].sellerNet  += getSellerEarning(o);
        acc[d].snapit     += getSnapitEarning(o);
        acc[d].salesExDel += getOrderAmount(o) - getDeliveryFee(o);
        acc[d].count      += 1;
        return acc;
    }, {});

    // History
    const allSorted = [...allOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const historyFiltered = allSorted.filter(o => {
        if (historyFilter === 'delivered' && !isDelivered(o)) return false;
        if (historyFilter === 'pending'   && (o.delivery_status||'').toLowerCase() !== 'pending') return false;
        if (historyFilter === 'cancelled' && !isCancelled(o)) return false;
        if (historySearch.trim()) {
            const q = historySearch.trim().toLowerCase();
            return (o.orderId||'').toLowerCase().includes(q) ||
                (o.cartItems||[]).some(i => (i.productId?.name||i.name||'').toLowerCase().includes(q));
        }
        return true;
    });

    const filteredProducts = products.filter(p =>
        !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
    );
    const outOfStockCount = products.filter(p => p.stock <= 0).length;
    const lowStockCount   = products.filter(p => p.stock > 0 && p.stock <= 5).length;

    // Loading
    if (loading && activeTab !== 'products') return (
        <div className='min-h-screen bg-slate-950 flex items-center justify-center'>
            <div className='text-center'>
                <div className='w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4' />
                <p className='font-black text-slate-400 text-sm uppercase tracking-widest'>Loading store data...</p>
            </div>
        </div>
    );

    const TABS = [
        { key: 'overview', icon: <HiOutlineChartBar size={16} />, label: 'Overview' },
        { key: 'packing',  icon: <HiOutlineCube size={16} />,     label: 'Packing' },
        { key: 'products', icon: <HiOutlineShoppingBag size={16}/>,label: 'Products' },
        { key: 'history',  icon: <HiOutlineClipboardList size={16}/>, label: 'History' },
        { key: 'earnings', icon: <HiOutlineCurrencyRupee size={16}/>, label: 'Earnings' },
    ];

    return (
        <div className='min-h-screen bg-slate-950 text-white'>

            {/* ── STICKY HEADER ── */}
            <div className='sticky top-0 z-30 bg-slate-950 border-b border-slate-800'>
                <div className='max-w-2xl mx-auto px-4 py-3'>
                    <div className='flex items-center justify-between'>
                        <div>
                            <h1 className='text-lg font-black tracking-tight text-white'>STORE PANEL</h1>
                            <p className='text-[10px] text-slate-500 font-bold uppercase tracking-widest'>Snapit — Paliganj</p>
                        </div>
                        <div className='flex gap-2 items-center'>
                            <button onClick={() => fetchOrders(true)}
                                className='w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all active:scale-90'>
                                <IoRefreshOutline size={18}/>
                            </button>
                            {/* Live indicator */}
                            <div className='flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5'>
                                <span className='w-2 h-2 bg-emerald-400 rounded-full animate-pulse' />
                                <span className='text-[10px] font-black text-slate-300'>LIVE</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick stats strip */}
                    <div className='flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide'>
                        {[
                            { label:'Pending',   val: pendingCount,   color:'text-amber-400',  bg:'bg-amber-500/10 border-amber-500/20' },
                            { label:'Packing',   val: packingCount,   color:'text-sky-400',    bg:'bg-sky-500/10 border-sky-500/20' },
                            { label:'Queue ₹',   val: fmtINRShort(queueEarning), color:'text-emerald-400', bg:'bg-emerald-500/10 border-emerald-500/20' },
                            { label:'Delivered', val: deliveredCount,  color:'text-green-400',  bg:'bg-green-500/10 border-green-500/20' },
                            { label:'All Earning',val: fmtINRShort(allTimeEarning), color:'text-orange-400', bg:'bg-orange-500/10 border-orange-500/20' },
                        ].map(s => (
                            <div key={s.label} className={`flex-shrink-0 ${s.bg} border rounded-xl px-3 py-1.5 text-center`}>
                                <p className='text-[9px] font-black text-slate-500 uppercase'>{s.label}</p>
                                <p className={`text-sm font-black ${s.color}`}>{s.val}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── TAB BAR ── */}
            <div className='sticky top-[105px] z-20 bg-slate-950/95 backdrop-blur border-b border-slate-800'>
                <div className='max-w-2xl mx-auto px-4'>
                    <div className='flex gap-1 py-2 overflow-x-auto scrollbar-hide'>
                        {TABS.map(t => (
                            <button key={t.key} onClick={() => setActiveTab(t.key)}
                                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                    activeTab === t.key
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                                }`}>
                                {t.icon}{t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className='max-w-2xl mx-auto px-4 py-5'>

                {/* ══════════ OVERVIEW TAB ══════════ */}
                {activeTab === 'overview' && (
                    <div className='flex flex-col gap-4'>

                        {/* Hero earning card */}
                        <div className='bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl p-6 shadow-2xl shadow-orange-500/20'>
                            <p className='text-[10px] font-black text-orange-100/70 uppercase tracking-widest mb-1'>All-Time Store Earnings</p>
                            <p className='text-4xl font-black text-white'>{fmtINR(allTimeEarning)}</p>
                            <div className='grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-orange-400/30'>
                                <div>
                                    <p className='text-[9px] font-black text-orange-200/70 uppercase'>Total Sales</p>
                                    <p className='text-sm font-black text-white'>{fmtINR(allTimeSales)}</p>
                                </div>
                                <div>
                                    <p className='text-[9px] font-black text-orange-200/70 uppercase'>Orders</p>
                                    <p className='text-sm font-black text-white'>{deliveredCount}</p>
                                </div>
                                <div>
                                    <p className='text-[9px] font-black text-orange-200/70 uppercase'>Delivery Earned</p>
                                    <p className='text-sm font-black text-orange-200'>-{fmtINR(allTimeDelivery)}</p>
                                </div>
                            </div>
                        </div>

                        {/* 4 stat grid */}
                        <div className='grid grid-cols-2 gap-3'>
                            <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                <div className='flex items-center justify-between mb-3'>
                                    <p className='text-[10px] font-black text-slate-500 uppercase'>Products Listed</p>
                                    <HiOutlineShoppingBag size={16} className='text-slate-600'/>
                                </div>
                                <p className='text-3xl font-black text-white'>{products.length}</p>
                                {outOfStockCount > 0 && (
                                    <p className='text-[10px] text-red-400 mt-1'>{outOfStockCount} out of stock</p>
                                )}
                                {lowStockCount > 0 && (
                                    <p className='text-[10px] text-amber-400'>{lowStockCount} low stock</p>
                                )}
                            </div>
                            <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                <div className='flex items-center justify-between mb-3'>
                                    <p className='text-[10px] font-black text-slate-500 uppercase'>Total Orders</p>
                                    <HiOutlineClipboardList size={16} className='text-slate-600'/>
                                </div>
                                <p className='text-3xl font-black text-white'>{allOrders.length}</p>
                                <p className='text-[10px] text-slate-500 mt-1'>{cancelledCount} cancelled</p>
                            </div>
                            <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                <div className='flex items-center justify-between mb-3'>
                                    <p className='text-[10px] font-black text-slate-500 uppercase'>Active Queue</p>
                                    <HiOutlineTruck size={16} className='text-slate-600'/>
                                </div>
                                <p className='text-3xl font-black text-amber-400'>{packingOrders.length}</p>
                                <p className='text-[10px] text-emerald-400 mt-1'>{fmtINR(queueEarning)} pending</p>
                            </div>
                            <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                <div className='flex items-center justify-between mb-3'>
                                    <p className='text-[10px] font-black text-slate-500 uppercase'>Avg Order Value</p>
                                    <HiOutlineTrendingUp size={16} className='text-slate-600'/>
                                </div>
                                <p className='text-3xl font-black text-white'>
                                    {fmtINRShort(deliveredCount > 0 ? allTimeSales / deliveredCount : 0)}
                                </p>
                                <p className='text-[10px] text-slate-500 mt-1'>per delivered order</p>
                            </div>
                        </div>

                        {/* Top selling products */}
                        {topProducts.length > 0 && (
                            <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                <div className='flex items-center justify-between mb-4'>
                                    <p className='text-xs font-black text-white uppercase tracking-wider'>Top Products (All Time)</p>
                                    <HiOutlineChartBar size={16} className='text-slate-600'/>
                                </div>
                                {topProducts.map(([name, qty], i) => {
                                    const maxQty = topProducts[0][1];
                                    const colors = ['bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-500'];
                                    return (
                                        <div key={name} className='mb-3 last:mb-0'>
                                            <div className='flex justify-between items-center mb-1'>
                                                <div className='flex items-center gap-2'>
                                                    <span className='text-[10px] font-black text-slate-600 w-4'>#{i+1}</span>
                                                    <p className='text-xs font-bold text-slate-200 truncate max-w-[180px]'>{name}</p>
                                                </div>
                                                <span className='text-xs font-black text-slate-400'>×{qty} sold</span>
                                            </div>
                                            <div className='w-full bg-slate-800 rounded-full h-1.5 overflow-hidden'>
                                                <div className={`${colors[i]} h-1.5 rounded-full transition-all duration-700`}
                                                    style={{ width: `${(qty / maxQty) * 100}%` }}/>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Last refreshed */}
                        <p className='text-center text-[10px] text-slate-700 font-bold'>
                            Last refreshed: {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                    </div>
                )}

                {/* ══════════ PACKING TAB ══════════ */}
                {activeTab === 'packing' && (
                    <div className='flex flex-col gap-4'>
                        {packingOrders.length > 0 && (
                            <div className='bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex items-center justify-between'>
                                <div>
                                    <p className='text-sm font-black text-white'>{packingOrders.length} Active Task{packingOrders.length > 1 ? 's' : ''}</p>
                                    <p className='text-[10px] text-slate-500'>Pack & notify rider when ready</p>
                                </div>
                                <div className='text-right'>
                                    <p className='text-[10px] font-black text-slate-500 uppercase'>Queue Earning</p>
                                    <p className='text-lg font-black text-emerald-400'>{fmtINR(queueEarning)}</p>
                                </div>
                            </div>
                        )}

                        {packingOrders.length === 0 ? (
                            <div className='bg-slate-900 border-2 border-dashed border-slate-700 rounded-3xl p-16 text-center'>
                                <div className='w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4'>
                                    <HiOutlineCheckCircle size={32} className='text-emerald-400'/>
                                </div>
                                <p className='font-black text-white text-lg'>All packed!</p>
                                <p className='text-slate-500 text-sm mt-1'>No pending orders right now</p>
                                <button onClick={() => fetchOrders(true)}
                                    className='mt-5 bg-orange-500 text-white font-black text-sm px-6 py-2.5 rounded-xl hover:bg-orange-600 transition-all'>
                                    Check for New Orders
                                </button>
                            </div>
                        ) : packingOrders.map(order => {
                            const sellerEarning = getSellerEarning(order);
                            const orderTotal    = getOrderAmount(order);
                            const deliveryFee   = getDeliveryFee(order);
                            const isPacking     = order.seller_status === 'Packing';
                            return (
                                <div key={order._id}
                                    className={`bg-slate-900 rounded-3xl border-2 overflow-hidden ${
                                        isPacking ? 'border-sky-500/40' : 'border-orange-500/30'
                                    }`}>
                                    {/* Order header */}
                                    <div className={`px-5 py-3 ${isPacking ? 'bg-sky-500/10' : 'bg-orange-500/10'} flex justify-between items-center`}>
                                        <div>
                                            <span className='font-mono text-sm font-black text-white'>{order.orderId}</span>
                                            <p className='text-[10px] text-slate-500 mt-0.5'>
                                                {new Date(order.createdAt).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                                            </p>
                                        </div>
                                        <div className='flex items-center gap-2'>
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase ${
                                                isPacking ? 'bg-sky-500/20 text-sky-300' : 'bg-orange-500/20 text-orange-300'
                                            }`}>
                                                {isPacking ? '📦 Packing' : '🆕 New Order'}
                                            </span>
                                            {order.payment_status === 'CASH ON DELIVERY'
                                                ? <span className='text-[10px] font-black bg-amber-500/20 text-amber-300 px-2 py-1 rounded-lg'>COD</span>
                                                : <span className='text-[10px] font-black bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-lg'>Paid</span>
                                            }
                                        </div>
                                    </div>

                                    <div className='p-5'>
                                        {order.store_details?.name && (
                                            <div className='flex items-center gap-2 mb-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-2'>
                                                <span className='text-indigo-400 text-sm'>🏪</span>
                                                <div>
                                                    <p className='text-[9px] font-black text-indigo-400 uppercase'>Store</p>
                                                    <p className='text-sm font-black text-indigo-300'>{order.store_details.name}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Items list */}
                                        <div className='bg-slate-800/50 rounded-2xl p-3 mb-4'>
                                            <p className='text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3'>Items to Pack</p>
                                            {(order.cartItems || []).map((item, i) => {
                                                const sp    = getItemSellerPrice(item);
                                                const qty   = Number(item.quantity) || 1;
                                                const total = sp * qty;
                                                return (
                                                    <div key={i} className='flex justify-between items-center py-2.5 border-b border-slate-700/50 last:border-0'>
                                                        <div className='flex items-center gap-2.5'>
                                                            <div className='w-2 h-2 rounded-full bg-orange-500 flex-shrink-0' />
                                                            <div>
                                                                <p className='text-sm font-bold text-slate-200'>{item.productId?.name || item.name}</p>
                                                                <p className='text-[10px] text-slate-500'>{fmtINR(sp)} × {qty}</p>
                                                            </div>
                                                        </div>
                                                        <div className='flex items-center gap-2'>
                                                            <span className='bg-slate-700 px-2 py-0.5 rounded-lg text-xs font-black text-slate-300'>×{qty}</span>
                                                            <span className='text-sm font-black text-white'>{fmtINR(total)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Financial summary */}
                                        <div className='bg-slate-800/50 rounded-2xl p-4 mb-4 space-y-2'>
                                            <div className='flex justify-between items-center'>
                                                <p className='text-[10px] font-black text-slate-400 uppercase'>Order Total</p>
                                                <p className='text-sm font-black text-white'>{fmtINR(orderTotal)}</p>
                                            </div>
                                            {deliveryFee > 0 && (
                                                <div className='flex justify-between items-center'>
                                                    <div className='flex items-center gap-1.5'>
                                                        <HiOutlineTruck size={12} className='text-red-400'/>
                                                        <p className='text-[10px] font-black text-red-400 uppercase'>Delivery Charge</p>
                                                    </div>
                                                    <p className='text-sm font-black text-red-400'>-{fmtINR(deliveryFee)}</p>
                                                </div>
                                            )}
                                            {getSnapitEarning(order) > 0 && (
                                                <div className='flex justify-between items-center'>
                                                    <p className='text-[10px] font-black text-amber-400 uppercase'>Snapit Margin Cut</p>
                                                    <p className='text-sm font-black text-amber-400'>-{fmtINR(getSnapitEarning(order))}</p>
                                                </div>
                                            )}
                                            <div className='flex justify-between items-center pt-2 border-t border-slate-700'>
                                                <p className='text-[10px] font-black text-emerald-400 uppercase'>Your Net Earning</p>
                                                <p className='text-xl font-black text-emerald-400'>{fmtINR(sellerEarning)}</p>
                                            </div>
                                            <div className='flex justify-between items-center'>
                                                <p className='text-[10px] font-black text-sky-400 uppercase'>Sales (excl. delivery)</p>
                                                <p className='text-sm font-black text-sky-400'>{fmtINR(orderTotal - deliveryFee)}</p>
                                            </div>
                                        </div>

                                        <button onClick={() => markAsReady(order.orderId)}
                                            className='w-full bg-orange-500 hover:bg-orange-600 text-white py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg shadow-orange-500/20'>
                                            🛵 Packed — Ready for Rider
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ══════════ PRODUCTS TAB ══════════ */}
                {activeTab === 'products' && (
                    <div>
                        {/* Sub tabs */}
                        <div className='flex gap-2 mb-4'>
                            {[{key:'list', label:'📋 My Products'},{key:'upload', label:'➕ Add New'}].map(t => (
                                <button key={t.key} onClick={() => setProductTab(t.key)}
                                    className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all ${
                                        productTab === t.key
                                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                            : 'bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-600'
                                    }`}>
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {productTab === 'list' && (
                            <div>
                                {/* Search + stats */}
                                <div className='flex gap-2 mb-4'>
                                    <div className='relative flex-1'>
                                        <IoSearchOutline size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-500'/>
                                        <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                                            placeholder='Search products...'
                                            className='w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold text-slate-200 focus:outline-none focus:border-orange-500 placeholder-slate-600'
                                        />
                                    </div>
                                </div>

                                {/* Stock alerts */}
                                {(outOfStockCount > 0 || lowStockCount > 0) && (
                                    <div className='flex gap-2 mb-4 flex-wrap'>
                                        {outOfStockCount > 0 && (
                                            <div className='flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2'>
                                                <HiOutlineXCircle size={14} className='text-red-400'/>
                                                <p className='text-xs font-black text-red-400'>{outOfStockCount} Out of stock</p>
                                            </div>
                                        )}
                                        {lowStockCount > 0 && (
                                            <div className='flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2'>
                                                <HiOutlineClock size={14} className='text-amber-400'/>
                                                <p className='text-xs font-black text-amber-400'>{lowStockCount} Low stock (≤5)</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {productsLoading ? (
                                    <div className='bg-slate-900 rounded-3xl p-12 text-center border border-slate-800'>
                                        <div className='w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3'/>
                                        <p className='font-black text-slate-500 text-sm'>Loading products...</p>
                                    </div>
                                ) : filteredProducts.length === 0 ? (
                                    <div className='bg-slate-900 rounded-3xl p-14 text-center border-2 border-dashed border-slate-700'>
                                        <p className='text-4xl mb-3'>📦</p>
                                        <p className='font-black text-white'>No products yet</p>
                                        <button onClick={() => setProductTab('upload')}
                                            className='mt-4 bg-orange-500 text-white font-black text-sm px-5 py-2 rounded-xl'>
                                            Add First Product
                                        </button>
                                    </div>
                                ) : (
                                    <div className='flex flex-col gap-3'>
                                        {filteredProducts.map(product => {
                                            const customerPrice = Number(product.sellerPrice||product.price||0) + Number(product.snapitMargin||0);
                                            const stockStatus   = product.stock <= 0 ? 'out' : product.stock <= 5 ? 'low' : 'ok';
                                            return (
                                                <div key={product._id}
                                                    className={`bg-slate-900 rounded-2xl p-4 border flex gap-4 items-start ${
                                                        stockStatus === 'out' ? 'border-red-500/30' :
                                                        stockStatus === 'low' ? 'border-amber-500/30' : 'border-slate-800'
                                                    }`}>
                                                    <img src={product.image?.[0] || ''} alt={product.name}
                                                        className='w-16 h-16 object-contain rounded-xl bg-slate-800 border border-slate-700 flex-shrink-0'/>
                                                    <div className='flex-1 min-w-0'>
                                                        <p className='font-black text-white text-sm truncate'>{product.name}</p>
                                                        <p className='text-[10px] text-slate-500 mt-0.5'>{product.unit}</p>

                                                        {/* Price breakdown */}
                                                        <div className='flex gap-2 mt-2 flex-wrap'>
                                                            <span className='text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg'>
                                                                Seller {fmtINR(product.sellerPrice||product.price||0)}
                                                            </span>
                                                            {Number(product.snapitMargin) > 0 && (
                                                                <span className='text-[10px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-lg'>
                                                                    +Margin {fmtINR(product.snapitMargin)}
                                                                </span>
                                                            )}
                                                            <span className='text-[10px] font-black bg-sky-500/15 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-lg'>
                                                                Customer {fmtINR(customerPrice)}
                                                            </span>
                                                            {Number(product.discount) > 0 && (
                                                                <span className='text-[10px] font-black bg-violet-500/15 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-lg'>
                                                                    {product.discount}% off
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Stock badge */}
                                                        <div className='flex items-center gap-2 mt-2.5'>
                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                                                                stockStatus === 'out' ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                                                                stockStatus === 'low' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                                                                'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                                            }`}>
                                                                {stockStatus === 'out' ? '❌ Out of stock' : `${product.stock} in stock`}
                                                            </span>
                                                        </div>

                                                        {/* Update stock row */}
                                                        <div className='flex items-center gap-2 mt-2.5'>
                                                            <input type='number' placeholder='New qty'
                                                                value={editingStock[product._id] ?? ''}
                                                                onChange={e => setEditingStock(p => ({ ...p, [product._id]: e.target.value }))}
                                                                className='w-20 text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-500'
                                                            />
                                                            <button onClick={() => handleUpdateStock(product._id)}
                                                                disabled={!editingStock[product._id]}
                                                                className='text-xs bg-orange-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-3 py-1.5 rounded-lg font-black'>
                                                                Update
                                                            </button>
                                                            <button onClick={() => handleDeleteProduct(product._id)}
                                                                className='text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1.5 rounded-lg font-black hover:bg-red-500/20'>
                                                                <MdDelete size={14}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {productTab === 'upload' && (
                            <form onSubmit={handleProductSubmit} className='flex flex-col gap-4'>
                                {/* Name */}
                                <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                    <label className='text-[10px] font-black text-slate-500 uppercase tracking-wider'>Product Name *</label>
                                    <input type='text' placeholder='e.g. Basmati Rice 5kg' required
                                        value={productForm.name}
                                        onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))}
                                        className='mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500 placeholder-slate-600'
                                    />
                                </div>

                                {/* Description */}
                                <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                    <label className='text-[10px] font-black text-slate-500 uppercase tracking-wider'>Description *</label>
                                    <textarea rows={3} placeholder='Describe the product...' required
                                        value={productForm.description}
                                        onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))}
                                        className='mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500 resize-none placeholder-slate-600'
                                    />
                                </div>

                                {/* Images */}
                                <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                    <label className='text-[10px] font-black text-slate-500 uppercase tracking-wider'>Product Images</label>
                                    <label htmlFor='sellerProductImage'
                                        className='mt-2 flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-orange-500 transition-all'>
                                        {imageLoading ? (
                                            <p className='text-sm text-slate-500 animate-pulse'>Uploading...</p>
                                        ) : (
                                            <>
                                                <FaCloudUploadAlt size={24} className='text-slate-600'/>
                                                <p className='text-xs font-bold text-slate-600 mt-1'>Tap to upload</p>
                                            </>
                                        )}
                                        <input id='sellerProductImage' type='file' accept='image/*' className='hidden' onChange={handleUploadImage}/>
                                    </label>
                                    {productForm.image.length > 0 && (
                                        <div className='flex gap-2 flex-wrap mt-3'>
                                            {productForm.image.map((img, i) => (
                                                <div key={i} className='relative w-16 h-16'>
                                                    <img src={img} className='w-full h-full object-contain rounded-xl bg-slate-800 border border-slate-700'/>
                                                    <button type='button'
                                                        onClick={() => setProductForm(p => ({ ...p, image: p.image.filter((_,idx) => idx !== i) }))}
                                                        className='absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]'>×</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Category */}
                                <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                    <label className='text-[10px] font-black text-slate-500 uppercase tracking-wider'>Category</label>
                                    <select value={selectCategory}
                                        className='mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500'
                                        onChange={e => {
                                            const cat = allCategory.find(c => c._id === e.target.value);
                                            if (cat && !productForm.category.some(c => c._id === cat._id))
                                                setProductForm(p => ({ ...p, category: [...p.category, cat] }));
                                            setSelectCategory('');
                                        }}>
                                        <option value=''>Select Category</option>
                                        {(allCategory||[]).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>
                                    <div className='flex flex-wrap gap-2 mt-2'>
                                        {productForm.category.map((c, i) => (
                                            <span key={i} className='flex items-center gap-1 bg-sky-500/15 text-sky-400 border border-sky-500/20 text-xs font-bold px-2 py-1 rounded-lg'>
                                                {c.name}<IoClose className='cursor-pointer' onClick={() => setProductForm(p => ({ ...p, category: p.category.filter((_,idx) => idx !== i) }))}/>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Sub Category */}
                                <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                    <label className='text-[10px] font-black text-slate-500 uppercase tracking-wider'>Sub Category</label>
                                    <select value={selectSubCategory}
                                        className='mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500'
                                        onChange={e => {
                                            const sub = allSubCategory.find(s => s._id === e.target.value);
                                            if (sub && !productForm.subCategory.some(s => s._id === sub._id))
                                                setProductForm(p => ({ ...p, subCategory: [...p.subCategory, sub] }));
                                            setSelectSubCategory('');
                                        }}>
                                        <option value=''>Select Sub Category</option>
                                        {(allSubCategory||[]).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                    </select>
                                    <div className='flex flex-wrap gap-2 mt-2'>
                                        {productForm.subCategory.map((s, i) => (
                                            <span key={i} className='flex items-center gap-1 bg-violet-500/15 text-violet-400 border border-violet-500/20 text-xs font-bold px-2 py-1 rounded-lg'>
                                                {s.name}<IoClose className='cursor-pointer' onClick={() => setProductForm(p => ({ ...p, subCategory: p.subCategory.filter((_,idx) => idx !== i) }))}/>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Unit + Stock */}
                                <div className='grid grid-cols-2 gap-3'>
                                    <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                        <label className='text-[10px] font-black text-slate-500 uppercase tracking-wider'>Unit *</label>
                                        <input type='text' placeholder='1kg / 500ml' required
                                            value={productForm.unit}
                                            onChange={e => setProductForm(p => ({ ...p, unit: e.target.value }))}
                                            className='mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500 placeholder-slate-600'
                                        />
                                    </div>
                                    <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                        <label className='text-[10px] font-black text-slate-500 uppercase tracking-wider'>Stock *</label>
                                        <input type='number' placeholder='50' required
                                            value={productForm.stock}
                                            onChange={e => setProductForm(p => ({ ...p, stock: e.target.value }))}
                                            className='mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500 placeholder-slate-600'
                                        />
                                    </div>
                                </div>

                                {/* Pricing */}
                                <div className='bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4'>
                                    <p className='text-[10px] font-black text-emerald-400 uppercase tracking-wider mb-3'>Pricing Setup</p>
                                    <div className='grid grid-cols-2 gap-3'>
                                        <div>
                                            <label className='text-[10px] font-black text-slate-500 uppercase'>Seller Price *</label>
                                            <div className='relative mt-1.5'>
                                                <span className='absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-500 text-sm'>₹</span>
                                                <input type='number' placeholder='200' required
                                                    value={productForm.sellerPrice}
                                                    onChange={e => setProductForm(p => ({ ...p, sellerPrice: e.target.value }))}
                                                    className='w-full bg-slate-800 border border-slate-700 rounded-xl pl-7 pr-3 py-2.5 text-sm font-bold text-white outline-none focus:border-emerald-500 placeholder-slate-600'
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className='text-[10px] font-black text-slate-500 uppercase'>Snapit Margin</label>
                                            <div className='relative mt-1.5'>
                                                <span className='absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-500 text-sm'>₹</span>
                                                <input type='number' placeholder='10'
                                                    value={productForm.snapitMargin}
                                                    onChange={e => setProductForm(p => ({ ...p, snapitMargin: e.target.value }))}
                                                    className='w-full bg-slate-800 border border-slate-700 rounded-xl pl-7 pr-3 py-2.5 text-sm font-bold text-white outline-none focus:border-emerald-500 placeholder-slate-600'
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className='mt-3 bg-slate-800 rounded-xl p-3 flex justify-between items-center border border-emerald-500/30'>
                                        <p className='text-[10px] font-black text-slate-400 uppercase'>Customer Pays</p>
                                        <p className='text-2xl font-black text-emerald-400'>{fmtINR(sellingPrice)}</p>
                                    </div>
                                    <div className='mt-2'>
                                        <label className='text-[10px] font-black text-slate-500 uppercase'>Discount %</label>
                                        <input type='number' placeholder='0'
                                            value={productForm.discount}
                                            onChange={e => setProductForm(p => ({ ...p, discount: e.target.value }))}
                                            className='mt-1.5 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500 placeholder-slate-600'
                                        />
                                    </div>
                                </div>

                                <button type='submit'
                                    className='w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-xl shadow-orange-500/20'>
                                    🚀 Upload Product
                                </button>
                            </form>
                        )}
                    </div>
                )}

                {/* ══════════ HISTORY TAB ══════════ */}
                {activeTab === 'history' && (
                    <div className='flex flex-col gap-4'>

                        {/* Stats */}
                        <div className='grid grid-cols-2 gap-3'>
                            {[
                                { label:'Total Orders',   val: allSorted.length,  color:'text-white' },
                                { label:'Delivered',      val: deliveredCount,    color:'text-emerald-400' },
                                { label:'Total Sales',    val: fmtINRShort(allTimeSales), color:'text-sky-400', sub:'excl. delivery' },
                                { label:'Cancelled',      val: cancelledCount,    color:'text-red-400' },
                            ].map(s => (
                                <div key={s.label} className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                    <p className='text-[10px] font-black text-slate-500 uppercase'>{s.label}</p>
                                    <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.val}</p>
                                    {s.sub && <p className='text-[10px] text-slate-600'>{s.sub}</p>}
                                </div>
                            ))}
                        </div>

                        {/* All-time sales hero */}
                        <div className='bg-slate-900 border border-slate-800 rounded-2xl p-5'>
                            <p className='text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1'>All-Time Sales (excl. delivery)</p>
                            <p className='text-3xl font-black text-white'>{fmtINR(allTimeSales)}</p>
                            <div className='flex gap-4 mt-3 pt-3 border-t border-slate-800 flex-wrap'>
                                <div><p className='text-[9px] text-slate-500 uppercase font-bold'>Orders</p><p className='text-base font-black text-white'>{deliveredCount}</p></div>
                                <div><p className='text-[9px] text-slate-500 uppercase font-bold'>Your Earnings</p><p className='text-base font-black text-emerald-400'>{fmtINR(allTimeEarning)}</p></div>
                                <div><p className='text-[9px] text-slate-500 uppercase font-bold'>Delivery Excl.</p><p className='text-base font-black text-red-400'>-{fmtINR(allTimeDelivery)}</p></div>
                            </div>
                        </div>

                        {/* Search */}
                        <div className='relative'>
                            <IoSearchOutline size={16} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500'/>
                            <input value={historySearch} onChange={e => setHistorySearch(e.target.value)}
                                placeholder='Search by order ID or product...'
                                className='w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-200 focus:outline-none focus:border-orange-500 placeholder-slate-600'
                            />
                            {historySearch && (
                                <button onClick={() => setHistorySearch('')}
                                    className='absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-lg'>×</button>
                            )}
                        </div>

                        {/* Filter pills + CSV export */}
                        <div className='flex gap-2 flex-wrap items-center'>
                            {[
                                {key:'all',       label:'All'},
                                {key:'delivered', label:'✅ Delivered'},
                                {key:'pending',   label:'⏳ Pending'},
                                {key:'cancelled', label:'❌ Cancelled'},
                            ].map(f => (
                                <button key={f.key} onClick={() => setHistoryFilter(f.key)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
                                        historyFilter === f.key
                                            ? 'bg-orange-500 text-white border-orange-500'
                                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                                    }`}>
                                    {f.label}
                                </button>
                            ))}
                            <button onClick={() => exportCSV(historyFiltered)}
                                className='ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-slate-900 text-emerald-400 border border-emerald-500/30 hover:bg-slate-800 transition-all'>
                                <HiOutlineDownload size={14}/> Export CSV
                            </button>
                        </div>

                        <p className='text-[11px] text-slate-600 font-bold'>
                            {historyFiltered.length} of {allSorted.length} orders
                            {historySearch && ` · "${historySearch}"`}
                        </p>

                        {/* Order cards */}
                        {historyFiltered.length === 0 ? (
                            <div className='bg-slate-900 rounded-3xl p-14 text-center border-2 border-dashed border-slate-700'>
                                <p className='text-4xl mb-3'>📭</p>
                                <p className='font-black text-white'>No orders found</p>
                            </div>
                        ) : historyFiltered.map(order => (
                            <div key={order._id} className='bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden'>
                                {/* Clickable header */}
                                <div
                                    className='flex justify-between items-center p-4 cursor-pointer hover:bg-slate-800/50 transition-all'
                                    onClick={() => setExpandedOrder(expandedOrder === order._id ? null : order._id)}>
                                    <div>
                                        <p className='font-mono text-xs font-bold text-white'>{order.orderId}</p>
                                        <p className='text-[10px] text-slate-500 mt-0.5'>
                                            {new Date(order.createdAt).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                                        </p>
                                    </div>
                                    <div className='flex items-center gap-2'>
                                        <StatusBadge status={order.delivery_status}/>
                                        <span className={`text-slate-500 text-sm transition-transform ${expandedOrder === order._id ? 'rotate-180' : ''}`}>▼</span>
                                    </div>
                                </div>

                                {/* Expanded */}
                                {expandedOrder === order._id && (
                                    <div className='border-t border-slate-800 p-4 bg-slate-800/30'>
                                        <p className='text-[9px] font-black text-slate-500 uppercase mb-3'>Products Sold</p>
                                        {(order.cartItems||[]).map((item, i) => {
                                            const sp  = getItemSellerPrice(item);
                                            const qty = Number(item.quantity)||1;
                                            return (
                                                <div key={i} className='flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0'>
                                                    <div>
                                                        <p className='text-sm font-bold text-slate-200'>{item.productId?.name || item.name}</p>
                                                        <p className='text-[10px] text-slate-500'>{fmtINR(sp)} × {qty}</p>
                                                    </div>
                                                    <p className='text-sm font-black text-white'>{fmtINR(sp * qty)}</p>
                                                </div>
                                            );
                                        })}

                                        {/* Financial summary */}
                                        <div className='mt-3 pt-3 border-t border-slate-700 space-y-1.5'>
                                            <div className='flex justify-between'>
                                                <p className='text-[10px] font-black text-slate-500 uppercase'>Order Total</p>
                                                <p className='text-sm font-black text-white'>{fmtINR(getOrderAmount(order))}</p>
                                            </div>
                                            {getDeliveryFee(order) > 0 && (
                                                <div className='flex justify-between'>
                                                    <div className='flex items-center gap-1.5'>
                                                        <HiOutlineTruck size={11} className='text-red-400'/>
                                                        <p className='text-[10px] font-black text-red-400 uppercase'>Delivery Charge</p>
                                                    </div>
                                                    <p className='text-sm font-black text-red-400'>-{fmtINR(getDeliveryFee(order))}</p>
                                                </div>
                                            )}
                                            <div className='flex justify-between'>
                                                <p className='text-[10px] font-black text-sky-400 uppercase'>Sales (excl. delivery)</p>
                                                <p className='text-sm font-black text-sky-400'>{fmtINR(getOrderAmount(order) - getDeliveryFee(order))}</p>
                                            </div>
                                            <div className='flex justify-between pt-1 border-t border-slate-700'>
                                                <p className='text-[10px] font-black text-emerald-400 uppercase'>Your Earning</p>
                                                <p className='text-sm font-black text-emerald-400'>{fmtINR(getSellerEarning(order))}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* ══════════ EARNINGS TAB ══════════ */}
                {activeTab === 'earnings' && (
                    <div className='flex flex-col gap-4'>

                        {/* Period filter */}
                        <div className='flex gap-2 flex-wrap'>
                            {[
                                {key:'today', label:'Today'},
                                {key:'week',  label:'This Week'},
                                {key:'month', label:'This Month'},
                                {key:'all',   label:'All Time'},
                            ].map(f => (
                                <button key={f.key} onClick={() => setEarningFilter(f.key)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
                                        earningFilter === f.key
                                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                                    }`}>
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {filteredEarnings.length === 0 ? (
                            <div className='bg-slate-900 rounded-3xl p-12 text-center border-2 border-dashed border-slate-700'>
                                <p className='text-4xl mb-3'>💸</p>
                                <p className='font-black text-white'>No delivered orders yet</p>
                                <p className='text-sm text-slate-500 mt-1'>Earnings appear once orders are delivered.</p>
                            </div>
                        ) : (
                            <>
                                {/* Earnings hero */}
                                <div className='bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6'>
                                    <p className='text-[9px] font-black text-emerald-400/60 uppercase tracking-widest mb-1'>Your Store Earnings</p>
                                    <p className='text-4xl font-black text-emerald-400'>{fmtINR(totalSellerEarning)}</p>
                                    <div className='grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-emerald-500/20'>
                                        <div>
                                            <p className='text-[9px] text-emerald-400/50 uppercase font-bold'>Gross (incl. delivery)</p>
                                            <p className='text-sm font-black text-white'>{fmtINR(totalGross)}</p>
                                        </div>
                                        <div>
                                            <p className='text-[9px] text-emerald-400/50 uppercase font-bold'>Sales (excl. delivery)</p>
                                            <p className='text-sm font-black text-sky-400'>{fmtINR(totalSalesExDel)}</p>
                                        </div>
                                        <div>
                                            <p className='text-[9px] text-emerald-400/50 uppercase font-bold'>Delivery Charge</p>
                                            <p className='text-sm font-black text-red-400'>-{fmtINR(totalDelivery)}</p>
                                        </div>
                                        {totalSnapitEarning > 0 && (
                                            <div>
                                                <p className='text-[9px] text-amber-400/60 uppercase font-bold'>Snapit Cut</p>
                                                <p className='text-sm font-black text-amber-400'>-{fmtINR(totalSnapitEarning)}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className='text-[9px] text-emerald-400/50 uppercase font-bold'>Orders Delivered</p>
                                            <p className='text-sm font-black text-white'>{totalOrders}</p>
                                        </div>
                                        <div>
                                            <p className='text-[9px] text-emerald-400/50 uppercase font-bold'>Avg. Per Order</p>
                                            <p className='text-sm font-black text-white'>{fmtINR(avgNet)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* 2 summary cards */}
                                <div className='grid grid-cols-2 gap-3'>
                                    <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                        <p className='text-[9px] font-black text-slate-500 uppercase'>Total Sells</p>
                                        <p className='text-3xl font-black text-white mt-1'>{totalOrders}</p>
                                        <p className='text-[9px] text-slate-600'>delivered orders</p>
                                    </div>
                                    <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                        <p className='text-[9px] font-black text-slate-500 uppercase'>Total Sales</p>
                                        <p className='text-2xl font-black text-sky-400 mt-1'>{fmtINRShort(totalSalesExDel)}</p>
                                        <p className='text-[9px] text-slate-600'>excl. delivery charge</p>
                                    </div>
                                </div>

                                {/* Product sell breakdown */}
                                {productList.length > 0 && (
                                    <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                        <div className='flex items-center justify-between mb-4'>
                                            <p className='text-xs font-black text-white uppercase tracking-wider'>Product Sell History</p>
                                            <HiOutlineChartBar size={16} className='text-slate-600'/>
                                        </div>
                                        {productList.map(([name, data], i) => {
                                            const pct    = totalSellerEarning > 0 ? (data.revenue / totalSellerEarning) * 100 : 0;
                                            const colors = ['bg-emerald-500','bg-sky-500','bg-orange-500','bg-violet-500','bg-amber-500'];
                                            return (
                                                <div key={name} className='mb-4 last:mb-0'>
                                                    <div className='flex justify-between items-center'>
                                                        <p className='text-xs font-bold text-slate-200 truncate max-w-[170px]'>{name}</p>
                                                        <div className='flex items-center gap-2'>
                                                            <span className='text-[10px] text-slate-500'>×{data.qty} sold</span>
                                                            <span className='text-xs font-black text-emerald-400'>{fmtINR(data.revenue)}</span>
                                                        </div>
                                                    </div>
                                                    <div className='w-full bg-slate-800 rounded-full h-2 mt-1.5 overflow-hidden'>
                                                        <div className={`${colors[i % colors.length]} h-2 rounded-full transition-all duration-700`}
                                                            style={{ width: `${pct.toFixed(1)}%` }}/>
                                                    </div>
                                                    <p className='text-[9px] text-slate-600 mt-0.5'>{pct.toFixed(1)}% of earnings</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Daily breakdown */}
                                <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                    <div className='flex items-center justify-between mb-4'>
                                        <p className='text-xs font-black text-white uppercase tracking-wider'>Daily Breakdown</p>
                                        <button onClick={() => exportCSV(filteredEarnings)}
                                            className='flex items-center gap-1.5 text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/15 transition-all'>
                                            <HiOutlineDownload size={12}/> CSV
                                        </button>
                                    </div>
                                    {Object.entries(byDate)
                                        .sort((a,b) => new Date(b[0]) - new Date(a[0]))
                                        .map(([date, d]) => (
                                            <div key={date} className='py-3 border-b border-slate-800 last:border-0'>
                                                <div className='flex justify-between items-center'>
                                                    <p className='text-sm font-bold text-slate-200'>{date}</p>
                                                    <p className='font-black text-emerald-400'>{fmtINR(d.sellerNet)}</p>
                                                </div>
                                                <div className='flex gap-3 mt-1 flex-wrap'>
                                                    <p className='text-[10px] text-slate-600'>{d.count} order{d.count>1?'s':''}</p>
                                                    <p className='text-[10px] text-slate-500'>Gross {fmtINR(d.gross)}</p>
                                                    <p className='text-[10px] text-sky-500'>Sales {fmtINR(d.salesExDel)}</p>
                                                    {d.delivery > 0 && <p className='text-[10px] text-red-400'>Delivery -{fmtINR(d.delivery)}</p>}
                                                    {d.snapit > 0 && <p className='text-[10px] text-amber-400'>Snapit -{fmtINR(d.snapit)}</p>}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};

export default SellerDashboard;