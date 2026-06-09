import React, { useEffect, useState, useCallback } from 'react';
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
    HiOutlineClock, HiOutlineDownload,
    HiOutlineReceiptTax, HiOutlineTag, HiOutlineCash,
} from 'react-icons/hi';

// ── Field getters ─────────────────────────────────────────────
const getOrderAmount      = (o) => Number(o.totalAmt ?? o.total_amount ?? o.amount ?? o.subTotalAmt ?? 0);
const getDeliveryFee      = (o) => Number(o.delivery_fee ?? o.deliveryFee ?? o.delivery_charge ?? 0);
const getItemSellerPrice  = (item) => Number(item.sellerPrice ?? item.seller_price ?? item.price ?? item.unit_price ?? 0);
const getItemSnapitMargin = (item) => Number(item.snapitMargin ?? item.snapit_margin ?? 0);

const getItemDiscount = (item) => {
    const d = Number(item.discount ?? item.productId?.discount ?? 0);
    return isNaN(d) ? 0 : d;
};

const getSellerEarning = (order) =>
    (order.cartItems || []).reduce((acc, item) => acc + getItemSellerPrice(item) * (Number(item.quantity) || 1), 0);

const getSnapitEarning = (order) =>
    (order.cartItems || []).reduce((acc, item) => acc + getItemSnapitMargin(item) * (Number(item.quantity) || 1), 0);

// ── Formatters ────────────────────────────────────────────────
const fmtINR = (n) =>
    `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtINRShort = (n) => {
    const num = Number(n);
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    if (num >= 1000)   return `₹${(num / 1000).toFixed(1)}K`;
    return `₹${num.toFixed(0)}`;
};

// ── Status helpers ────────────────────────────────────────────
const isDelivered = (o) => (o.delivery_status || '').trim().toLowerCase() === 'delivered';
const isCancelled = (o) => (o.delivery_status || '').trim().toLowerCase() === 'cancelled';

const STATUS_CONFIG = {
    delivered:          { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Delivered' },
    'out for delivery': { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Out for Delivery' },
    confirmed:          { bg: 'bg-violet-100',  text: 'text-violet-700',  dot: 'bg-violet-500',  label: 'Confirmed' },
    cancelled:          { bg: 'bg-red-100',     text: 'text-red-600',     dot: 'bg-red-500',     label: 'Cancelled' },
    pending:            { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Pending' },
    packing:            { bg: 'bg-sky-100',     text: 'text-sky-700',     dot: 'bg-sky-500',     label: 'Packing' },
};
const getStatusConfig = (s) => STATUS_CONFIG[(s || '').toLowerCase()] || STATUS_CONFIG.pending;

const StatusBadge = ({ status }) => {
    const cfg = getStatusConfig(status);
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${cfg.bg} ${cfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
};

const exportCSV = (orders) => {
    const rows = [
        ['Order ID','Date','Status','Items','Gross (incl. delivery)','Delivery Fee','Snapit Cut','Your Earning'],
        ...orders.map(o => [
            o.orderId,
            new Date(o.createdAt).toLocaleDateString('en-IN'),
            o.delivery_status,
            (o.cartItems || []).map(i => `${i.productId?.name || i.name} x${i.quantity}`).join('; '),
            getOrderAmount(o).toFixed(2),
            getDeliveryFee(o).toFixed(2),
            getSnapitEarning(o).toFixed(2),
            getSellerEarning(o).toFixed(2),
        ])
    ];
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'store-orders.csv'; a.click();
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

    const [salesFilter, setSalesFilter]               = useState('all');
    const [salesOrderSearch, setSalesOrderSearch]     = useState('');
    const [expandedSalesOrder, setExpandedSalesOrder] = useState(null);
    const [editingProductPrice, setEditingProductPrice] = useState({});
    const [updatingPrice, setUpdatingPrice]             = useState({});

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

    // ── FIX 1: Select only stable primitives from Redux to avoid
    //           infinite re-renders caused by new object references ──
    const userId    = useSelector(state => state.user.user?._id ?? state.user?._id);
    const userName  = useSelector(state => state.user.user?.name ?? state.user?.name ?? '');
    const storeName = useSelector(state =>
        state.user.user?.store_name  ?? state.user.user?.storeName  ??
        state.user.user?.shop_name   ?? state.user.user?.name       ??
        state.user?.store_name       ?? state.user?.storeName       ??
        state.user?.shop_name        ?? state.user?.name            ?? ''
    );

    const sellingPrice = Number(productForm.sellerPrice || 0) + Number(productForm.snapitMargin || 0);

    // ── Data fetchers wrapped in useCallback so they're stable refs ──
    // ── FIX 2: useCallback prevents new function references each render,
    //           which would otherwise re-trigger effects endlessly ────
    const fetchOrders = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await Axios({ ...SummaryApi.getSellerOrders });
            if (res.data.success) {
                setAllOrders(Array.isArray(res.data.data) ? res.data.data : []);
                setLastRefreshed(new Date());
            }
        } catch { toast.error('Failed to fetch orders'); }
        finally { setLoading(false); }
    }, []); // no deps — Axios and SummaryApi are module-level constants

    const fetchProducts = useCallback(async () => {
        setProductsLoading(true);
        try {
            const res = await Axios({
                ...SummaryApi.getSellerProducts,
                data: { page: 1, limit: 100 }
            });
            if (res.data.success) setProducts(Array.isArray(res.data.data) ? res.data.data : []);
        } catch { toast.error('Failed to fetch products'); }
        finally { setProductsLoading(false); }
    }, []); // no deps — same reason

    const markAsReady = async (orderId) => {
        try {
            const res = await Axios({ ...SummaryApi.updateSellerStatus, data: { orderId, sellerStatus: 'Ready for Pickup' } });
            if (res.data.success) { toast.success('Rider Notified!'); fetchOrders(true); }
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

    const handleUpdateCustomerPrice = async (productId, productName) => {
        const priceData = editingProductPrice[productId];
        if (!priceData) return;
        const sp     = Number(priceData.sellerPrice)  || 0;
        const margin = Number(priceData.snapitMargin) || 0;
        const disc   = Number(priceData.discount)     || 0;
        setUpdatingPrice(p => ({ ...p, [productId]: true }));
        try {
            const res = await Axios({
                ...SummaryApi.updateProductDetails,
                data: { _id: productId, sellerPrice: sp, snapitMargin: margin, sellingPrice: sp + margin, price: sp + margin, discount: disc },
            });
            if (res.data.success) {
                toast.success(`Price updated for ${productName}!`);
                setEditingProductPrice(p => { const n = { ...p }; delete n[productId]; return n; });
                fetchProducts();
            }
        } catch { toast.error('Price update failed'); }
        finally { setUpdatingPrice(p => ({ ...p, [productId]: false })); }
    };

    // ── Effects ───────────────────────────────────────────────
    // FIX 3: Depend on userId (stable string), NOT the user object.
    //         fetchOrders / fetchProducts are stable via useCallback.
    //         This effect now only runs when the user actually changes.
    useEffect(() => {
        if (!userId) return;
        fetchOrders();
        fetchProducts();
        const iv = setInterval(() => fetchOrders(true), 30000);
        return () => clearInterval(iv);
    }, [userId, fetchOrders, fetchProducts]);

    // FIX 4: Same fix — depend on activeTab + userId (primitives only)
    useEffect(() => {
        if (activeTab === 'products' && userId) fetchProducts();
    }, [activeTab, userId, fetchProducts]);

    // ── Computed values ───────────────────────────────────────
    const now = new Date();

    const packingOrders  = allOrders.filter(o =>
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

    const allTimeSales    = allOrders.filter(isDelivered).reduce((a, o) => a + getOrderAmount(o), 0);
    const allTimeEarning  = allOrders.filter(isDelivered).reduce((a, o) => a + getSellerEarning(o), 0);
    const allTimeDelivery = allOrders.filter(isDelivered).reduce((a, o) => a + getDeliveryFee(o), 0);
    const queueEarning    = packingOrders.reduce((a, o) => a + getSellerEarning(o), 0);

    const salesFilteredOrders = (() => {
        const base = allOrders.filter(isDelivered);
        const d = new Date(now);
        if (salesFilter === 'today') return base.filter(o => new Date(o.createdAt).toDateString() === now.toDateString());
        if (salesFilter === 'week')  { d.setDate(now.getDate()-7); return base.filter(o => new Date(o.createdAt) >= d); }
        if (salesFilter === 'month') return base.filter(o => { const od = new Date(o.createdAt); return od.getMonth() === now.getMonth() && od.getFullYear() === now.getFullYear(); });
        return base;
    })();

    const salesTotalGross    = salesFilteredOrders.reduce((a, o) => a + getOrderAmount(o), 0);
    const salesTotalDelivery = salesFilteredOrders.reduce((a, o) => a + getDeliveryFee(o), 0);
    const salesTotalSeller   = salesFilteredOrders.reduce((a, o) => a + getSellerEarning(o), 0);
    const salesTotalSnapit   = salesFilteredOrders.reduce((a, o) => a + getSnapitEarning(o), 0);

    const salesProductMap = salesFilteredOrders.reduce((acc, order) => {
        (order.cartItems || []).forEach(item => {
            const pid         = item.productId?._id || item.productId || null;
            const name        = item.productId?.name || item.name || 'Unknown';
            const qty         = Number(item.quantity) || 1;
            const sellerP     = getItemSellerPrice(item);
            const marginP     = getItemSnapitMargin(item);
            const discountPct = getItemDiscount(item);
            const mrp         = sellerP + marginP;
            const afterDisc   = discountPct > 0 ? mrp * (1 - discountPct / 100) : mrp;
            if (!acc[name]) acc[name] = {
                pid, qty: 0, sellerRevenue: 0, snapitRevenue: 0,
                sellerPrice: sellerP, snapitMargin: marginP,
                discount: discountPct, mrp, afterDiscount: afterDisc,
            };
            acc[name].qty           += qty;
            acc[name].sellerRevenue += sellerP * qty;
            acc[name].snapitRevenue += marginP * qty;
        });
        return acc;
    }, {});
    const salesProductList = Object.entries(salesProductMap).sort((a, b) => b[1].sellerRevenue - a[1].sellerRevenue);

    const salesOrderHistory = [...salesFilteredOrders]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .filter(o => {
            if (!salesOrderSearch.trim()) return true;
            const q = salesOrderSearch.trim().toLowerCase();
            return (o.orderId||'').toLowerCase().includes(q) ||
                (o.cartItems||[]).some(i => (i.productId?.name||i.name||'').toLowerCase().includes(q));
        });

    const productEarnings = filteredEarnings.reduce((acc, order) => {
        (order.cartItems || []).forEach(item => {
            const name = item.productId?.name || item.name || 'Unknown';
            const qty  = Number(item.quantity) || 1;
            const sp   = getItemSellerPrice(item);
            if (!acc[name]) acc[name] = { qty:0, revenue:0 };
            acc[name].qty += qty; acc[name].revenue += sp * qty;
        });
        return acc;
    }, {});
    const productList = Object.entries(productEarnings).sort((a, b) => b[1].revenue - a[1].revenue);

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
        const d = new Date(o.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
        if (!acc[d]) acc[d] = { gross:0, sellerNet:0, snapit:0, delivery:0, count:0 };
        acc[d].gross     += getOrderAmount(o);
        acc[d].delivery  += getDeliveryFee(o);
        acc[d].sellerNet += getSellerEarning(o);
        acc[d].snapit    += getSnapitEarning(o);
        acc[d].count     += 1;
        return acc;
    }, {});

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

    if (loading && activeTab !== 'products') return (
        <div className='min-h-screen bg-slate-950 flex items-center justify-center'>
            <div className='text-center'>
                <div className='w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4' />
                <p className='font-black text-slate-400 text-sm uppercase tracking-widest'>Loading store data...</p>
            </div>
        </div>
    );

    const TABS = [
        { key:'overview', icon:<HiOutlineChartBar size={16}/>,      label:'Overview' },
        { key:'packing',  icon:<HiOutlineCube size={16}/>,          label:'Packing' },
        { key:'products', icon:<HiOutlineShoppingBag size={16}/>,   label:'Products' },
        { key:'sales',    icon:<HiOutlineReceiptTax size={16}/>,    label:'Sales' },
        { key:'history',  icon:<HiOutlineClipboardList size={16}/>, label:'History' },
        { key:'earnings', icon:<HiOutlineCurrencyRupee size={16}/>, label:'Earnings' },
    ];

    // ── Reusable order money breakdown ────────────────────────
    const OrderMoneyBreakdown = ({ order }) => {
        const sellerEarning = getSellerEarning(order);
        const snapitCut     = getSnapitEarning(order);
        const deliveryFee   = getDeliveryFee(order);
        const orderTotal    = getOrderAmount(order);
        const sumMRP = (order.cartItems || []).reduce((acc, item) => {
            return acc + (getItemSellerPrice(item) + getItemSnapitMargin(item)) * (Number(item.quantity) || 1);
        }, 0);
        const discountAbsorbed = sumMRP - (orderTotal - deliveryFee);
        const hasDiscount = discountAbsorbed > 0.5;
        return (
            <div className='mt-3 pt-3 border-t border-slate-700 space-y-2'>
                <p className='text-[9px] font-black text-slate-500 uppercase tracking-widest'>Where Did The Money Go?</p>
                <div className='flex justify-between items-start'>
                    <div>
                        <p className='text-[10px] text-slate-300'>Customer Paid (Total)</p>
                        <p className='text-[9px] text-slate-600'>including delivery</p>
                    </div>
                    <p className='text-sm font-black text-white'>{fmtINR(orderTotal)}</p>
                </div>
                {deliveryFee > 0 && (
                    <div className='flex justify-between items-start pl-3 border-l-2 border-red-500/30'>
                        <div className='flex items-center gap-1.5'>
                            <HiOutlineTruck size={11} className='text-red-400'/>
                            <div>
                                <p className='text-[10px] text-red-400'>Delivery → Rider</p>
                                <p className='text-[9px] text-slate-600'>not your money</p>
                            </div>
                        </div>
                        <p className='text-sm font-black text-red-400'>−{fmtINR(deliveryFee)}</p>
                    </div>
                )}
                {hasDiscount && (
                    <div className='flex justify-between items-start pl-3 border-l-2 border-violet-500/30'>
                        <div className='flex items-center gap-1.5'>
                            <HiOutlineTag size={11} className='text-violet-400'/>
                            <div>
                                <p className='text-[10px] text-violet-400'>Discount Given</p>
                                <p className='text-[9px] text-slate-600'>deducted from MRP</p>
                            </div>
                        </div>
                        <p className='text-sm font-black text-violet-400'>−{fmtINR(discountAbsorbed)}</p>
                    </div>
                )}
                {snapitCut > 0 && (
                    <div className='flex justify-between items-start pl-3 border-l-2 border-amber-500/30'>
                        <div>
                            <p className='text-[10px] text-amber-400'>Snapit Platform Cut</p>
                            <p className='text-[9px] text-slate-600'>margin you set for platform</p>
                        </div>
                        <p className='text-sm font-black text-amber-400'>−{fmtINR(snapitCut)}</p>
                    </div>
                )}
                <div className='flex justify-between items-center pt-2 border-t border-slate-700 bg-emerald-500/5 rounded-xl px-3 py-2.5'>
                    <div>
                        <p className='text-xs font-black text-emerald-400'>💰 Your Earning</p>
                        <p className='text-[9px] text-emerald-700'>your price × qty, all items</p>
                    </div>
                    <p className='text-xl font-black text-emerald-400'>{fmtINR(sellerEarning)}</p>
                </div>
            </div>
        );
    };

    return (
        <div className='min-h-screen bg-slate-950 text-white'>
            <div className='sticky top-0 z-30 bg-slate-950 border-b border-slate-800'>
                <div className='max-w-2xl mx-auto px-4 pt-3 pb-2'>
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
                            <div className='flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5'>
                                <span className='w-2 h-2 bg-emerald-400 rounded-full animate-pulse' />
                                <span className='text-[10px] font-black text-slate-300'>LIVE</span>
                            </div>
                        </div>
                    </div>
                    <div className='flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide'>
                        {[
                            { label:'Pending',     val: pendingCount,               color:'text-amber-400',   bg:'bg-amber-500/10 border-amber-500/20' },
                            { label:'Packing',     val: packingCount,               color:'text-sky-400',     bg:'bg-sky-500/10 border-sky-500/20' },
                            { label:'Queue ₹',     val: fmtINRShort(queueEarning),  color:'text-emerald-400', bg:'bg-emerald-500/10 border-emerald-500/20' },
                            { label:'Delivered',   val: deliveredCount,             color:'text-green-400',   bg:'bg-green-500/10 border-green-500/20' },
                            { label:'All Earning', val: fmtINRShort(allTimeEarning),color:'text-orange-400',  bg:'bg-orange-500/10 border-orange-500/20' },
                        ].map(s => (
                            <div key={s.label} className={`flex-shrink-0 ${s.bg} border rounded-xl px-3 py-1.5 text-center`}>
                                <p className='text-[9px] font-black text-slate-500 uppercase'>{s.label}</p>
                                <p className={`text-sm font-black ${s.color}`}>{s.val}</p>
                            </div>
                        ))}
                    </div>
                </div>
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
                        <div className='bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl p-6 shadow-2xl shadow-orange-500/20'>
                            <p className='text-[10px] font-black text-orange-100/70 uppercase tracking-widest mb-1'>All-Time Store Earnings</p>
                            <p className='text-4xl font-black text-white'>{fmtINR(allTimeEarning)}</p>
                            <p className='text-[10px] text-orange-200/60 mt-0.5'>your price × qty, all delivered orders</p>
                            <div className='grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-orange-400/30'>
                                <div>
                                    <p className='text-[9px] font-black text-orange-200/70 uppercase'>Gross Sales</p>
                                    <p className='text-sm font-black text-white'>{fmtINR(allTimeSales)}</p>
                                </div>
                                <div>
                                    <p className='text-[9px] font-black text-orange-200/70 uppercase'>Orders</p>
                                    <p className='text-sm font-black text-white'>{deliveredCount}</p>
                                </div>
                                <div>
                                    <p className='text-[9px] font-black text-orange-200/70 uppercase'>Delivery</p>
                                    <p className='text-sm font-black text-orange-200'>-{fmtINR(allTimeDelivery)}</p>
                                </div>
                            </div>
                        </div>

                        <div className='grid grid-cols-2 gap-3'>
                            <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                <div className='flex items-center justify-between mb-3'>
                                    <p className='text-[10px] font-black text-slate-500 uppercase'>Products Listed</p>
                                    <HiOutlineShoppingBag size={16} className='text-slate-600'/>
                                </div>
                                <p className='text-3xl font-black text-white'>{products.length}</p>
                                {outOfStockCount > 0 && <p className='text-[10px] text-red-400 mt-1'>{outOfStockCount} out of stock</p>}
                                {lowStockCount > 0 && <p className='text-[10px] text-amber-400'>{lowStockCount} low stock</p>}
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

                        {topProducts.length > 0 && (
                            <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                <div className='flex items-center justify-between mb-4'>
                                    <p className='text-xs font-black text-white uppercase tracking-wider'>Top Products (All Time)</p>
                                    <HiOutlineChartBar size={16} className='text-slate-600'/>
                                </div>
                                {topProducts.map(([name, qty], i) => {
                                    const maxQty = topProducts[0][1];
                                    const colors = ['bg-orange-500','bg-amber-500','bg-emerald-500','bg-sky-500','bg-violet-500'];
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
                                                    style={{ width:`${(qty/maxQty)*100}%` }}/>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <p className='text-center text-[10px] text-slate-700 font-bold'>
                            Last refreshed: {lastRefreshed.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
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
                                <div key={order._id} className={`bg-slate-900 rounded-3xl border-2 overflow-hidden ${isPacking ? 'border-sky-500/40' : 'border-orange-500/30'}`}>
                                    <div className={`px-5 py-3 ${isPacking ? 'bg-sky-500/10' : 'bg-orange-500/10'} flex justify-between items-center`}>
                                        <div>
                                            <span className='font-mono text-sm font-black text-white'>{order.orderId}</span>
                                            <p className='text-[10px] text-slate-500 mt-0.5'>
                                                {new Date(order.createdAt).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                                            </p>
                                        </div>
                                        <div className='flex items-center gap-2'>
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase ${isPacking ? 'bg-sky-500/20 text-sky-300' : 'bg-orange-500/20 text-orange-300'}`}>
                                                {isPacking ? '📦 Packing' : '🆕 New Order'}
                                            </span>
                                            {order.payment_status === 'CASH ON DELIVERY'
                                                ? <span className='text-[10px] font-black bg-amber-500/20 text-amber-300 px-2 py-1 rounded-lg'>COD</span>
                                                : <span className='text-[10px] font-black bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-lg'>Paid</span>
                                            }
                                        </div>
                                    </div>
                                    <div className='p-5'>
                                        <div className='bg-slate-800/50 rounded-2xl p-3 mb-4'>
                                            <p className='text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3'>Items to Pack</p>
                                            {(order.cartItems || []).map((item, i) => {
                                                const sp   = getItemSellerPrice(item);
                                                const qty  = Number(item.quantity) || 1;
                                                const disc = getItemDiscount(item);
                                                const mrp  = sp + getItemSnapitMargin(item);
                                                const paid = disc > 0 ? mrp * (1 - disc / 100) : mrp;
                                                return (
                                                    <div key={i} className='flex justify-between items-center py-2.5 border-b border-slate-700/50 last:border-0'>
                                                        <div className='flex items-center gap-2.5'>
                                                            <div className='w-2 h-2 rounded-full bg-orange-500 flex-shrink-0'/>
                                                            <div>
                                                                <p className='text-sm font-bold text-slate-200'>{item.productId?.name || item.name}</p>
                                                                <p className='text-[10px] text-slate-500'>
                                                                    {disc > 0
                                                                        ? <><span className='line-through text-slate-600'>{fmtINR(mrp)}</span> <span className='text-sky-400'>{fmtINR(paid)}</span> <span className='text-violet-400'>({disc}% off)</span></>
                                                                        : <span>Customer pays {fmtINR(mrp)}</span>
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className='flex items-center gap-2'>
                                                            <span className='bg-slate-700 px-2 py-0.5 rounded-lg text-xs font-black text-slate-300'>×{qty}</span>
                                                            <span className='text-sm font-black text-emerald-400'>{fmtINR(sp * qty)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className='bg-slate-800/50 rounded-2xl p-4 mb-4 space-y-2'>
                                            <div className='flex justify-between'>
                                                <p className='text-[10px] font-black text-slate-400 uppercase'>Customer Paid (Total)</p>
                                                <p className='text-sm font-black text-white'>{fmtINR(orderTotal)}</p>
                                            </div>
                                            {deliveryFee > 0 && (
                                                <div className='flex justify-between'>
                                                    <div className='flex items-center gap-1.5'>
                                                        <HiOutlineTruck size={12} className='text-red-400'/>
                                                        <p className='text-[10px] font-black text-red-400 uppercase'>Delivery → Rider</p>
                                                    </div>
                                                    <p className='text-sm font-black text-red-400'>-{fmtINR(deliveryFee)}</p>
                                                </div>
                                            )}
                                            {getSnapitEarning(order) > 0 && (
                                                <div className='flex justify-between'>
                                                    <p className='text-[10px] font-black text-amber-400 uppercase'>Snapit Platform Cut</p>
                                                    <p className='text-sm font-black text-amber-400'>-{fmtINR(getSnapitEarning(order))}</p>
                                                </div>
                                            )}
                                            <div className='flex justify-between pt-2 border-t border-slate-700 bg-emerald-500/5 rounded-xl px-2 py-2 mt-1'>
                                                <div>
                                                    <p className='text-[10px] font-black text-emerald-400 uppercase'>💰 Your Earning</p>
                                                    <p className='text-[9px] text-emerald-700'>your price × qty</p>
                                                </div>
                                                <p className='text-xl font-black text-emerald-400'>{fmtINR(sellerEarning)}</p>
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
                        <div className='flex gap-2 mb-4'>
                            {[{key:'list',label:'📋 My Products'},{key:'upload',label:'➕ Add New'}].map(t => (
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
                                <div className='relative mb-4'>
                                    <IoSearchOutline size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-500'/>
                                    <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                                        placeholder='Search products...'
                                        className='w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold text-slate-200 focus:outline-none focus:border-orange-500 placeholder-slate-600'
                                    />
                                </div>
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
                                            const sellerP    = Number(product.sellerPrice||product.price||0);
                                            const marginP    = Number(product.snapitMargin||0);
                                            const mrp        = sellerP + marginP;
                                            const discPct    = Number(product.discount||0);
                                            const finalPrice = discPct > 0 ? mrp * (1 - discPct / 100) : mrp;
                                            const stockStatus = product.stock <= 0 ? 'out' : product.stock <= 5 ? 'low' : 'ok';
                                            return (
                                                <div key={product._id}
                                                    className={`bg-slate-900 rounded-2xl p-4 border flex gap-4 items-start ${
                                                        stockStatus==='out' ? 'border-red-500/30' : stockStatus==='low' ? 'border-amber-500/30' : 'border-slate-800'
                                                    }`}>
                                                    <img src={product.image?.[0]||''} alt={product.name}
                                                        className='w-16 h-16 object-contain rounded-xl bg-slate-800 border border-slate-700 flex-shrink-0'/>
                                                    <div className='flex-1 min-w-0'>
                                                        <p className='font-black text-white text-sm truncate'>{product.name}</p>
                                                        <p className='text-[10px] text-slate-500 mt-0.5'>{product.unit}</p>
                                                        <div className='flex gap-2 mt-2 flex-wrap'>
                                                            <span className='text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg'>
                                                                Your Price {fmtINR(sellerP)}
                                                            </span>
                                                            {marginP > 0 && (
                                                                <span className='text-[10px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-lg'>
                                                                    +Margin {fmtINR(marginP)}
                                                                </span>
                                                            )}
                                                            {discPct > 0 ? (
                                                                <>
                                                                    <span className='text-[10px] font-black bg-slate-700 text-slate-500 px-2 py-0.5 rounded-lg line-through'>
                                                                        MRP {fmtINR(mrp)}
                                                                    </span>
                                                                    <span className='text-[10px] font-black bg-sky-500/15 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded-lg'>
                                                                        Customer Pays {fmtINR(finalPrice)} ({discPct}% off)
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className='text-[10px] font-black bg-sky-500/15 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-lg'>
                                                                    Customer Pays {fmtINR(mrp)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className='flex items-center gap-2 mt-2.5'>
                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                                                                stockStatus==='out' ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                                                                stockStatus==='low' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                                                                'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                                            }`}>
                                                                {stockStatus==='out' ? '❌ Out of stock' : `${product.stock} in stock`}
                                                            </span>
                                                        </div>
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
                                <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                    <label className='text-[10px] font-black text-slate-500 uppercase tracking-wider'>Product Name *</label>
                                    <input type='text' placeholder='e.g. Basmati Rice 5kg' required value={productForm.name}
                                        onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))}
                                        className='mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500 placeholder-slate-600'/>
                                </div>
                                <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                    <label className='text-[10px] font-black text-slate-500 uppercase tracking-wider'>Description *</label>
                                    <textarea rows={3} placeholder='Describe the product...' required value={productForm.description}
                                        onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))}
                                        className='mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500 resize-none placeholder-slate-600'/>
                                </div>
                                <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                    <label className='text-[10px] font-black text-slate-500 uppercase tracking-wider'>Product Images</label>
                                    <label htmlFor='sellerProductImage'
                                        className='mt-2 flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-orange-500 transition-all'>
                                        {imageLoading ? <p className='text-sm text-slate-500 animate-pulse'>Uploading...</p> : (
                                            <><FaCloudUploadAlt size={24} className='text-slate-600'/><p className='text-xs font-bold text-slate-600 mt-1'>Tap to upload</p></>
                                        )}
                                        <input id='sellerProductImage' type='file' accept='image/*' className='hidden' onChange={handleUploadImage}/>
                                    </label>
                                    {productForm.image.length > 0 && (
                                        <div className='flex gap-2 flex-wrap mt-3'>
                                            {productForm.image.map((img, i) => (
                                                <div key={i} className='relative w-16 h-16'>
                                                    <img src={img} className='w-full h-full object-contain rounded-xl bg-slate-800 border border-slate-700'/>
                                                    <button type='button' onClick={() => setProductForm(p => ({ ...p, image: p.image.filter((_,idx) => idx !== i) }))}
                                                        className='absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]'>×</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                    <label className='text-[10px] font-black text-slate-500 uppercase tracking-wider'>Category</label>
                                    <select value={selectCategory}
                                        className='mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500'
                                        onChange={e => { const cat = allCategory.find(c => c._id===e.target.value); if(cat && !productForm.category.some(c=>c._id===cat._id)) setProductForm(p=>({...p,category:[...p.category,cat]})); setSelectCategory(''); }}>
                                        <option value=''>Select Category</option>
                                        {(allCategory||[]).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>
                                    <div className='flex flex-wrap gap-2 mt-2'>
                                        {productForm.category.map((c,i) => (
                                            <span key={i} className='flex items-center gap-1 bg-sky-500/15 text-sky-400 border border-sky-500/20 text-xs font-bold px-2 py-1 rounded-lg'>
                                                {c.name}<IoClose className='cursor-pointer' onClick={() => setProductForm(p=>({...p,category:p.category.filter((_,idx)=>idx!==i)}))}/>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                    <label className='text-[10px] font-black text-slate-500 uppercase tracking-wider'>Sub Category</label>
                                    <select value={selectSubCategory}
                                        className='mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500'
                                        onChange={e => { const sub = allSubCategory.find(s=>s._id===e.target.value); if(sub && !productForm.subCategory.some(s=>s._id===sub._id)) setProductForm(p=>({...p,subCategory:[...p.subCategory,sub]})); setSelectSubCategory(''); }}>
                                        <option value=''>Select Sub Category</option>
                                        {(allSubCategory||[]).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                    </select>
                                    <div className='flex flex-wrap gap-2 mt-2'>
                                        {productForm.subCategory.map((s,i) => (
                                            <span key={i} className='flex items-center gap-1 bg-violet-500/15 text-violet-400 border border-violet-500/20 text-xs font-bold px-2 py-1 rounded-lg'>
                                                {s.name}<IoClose className='cursor-pointer' onClick={() => setProductForm(p=>({...p,subCategory:p.subCategory.filter((_,idx)=>idx!==i)}))}/>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className='grid grid-cols-2 gap-3'>
                                    <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                        <label className='text-[10px] font-black text-slate-500 uppercase tracking-wider'>Unit *</label>
                                        <input type='text' placeholder='1kg / 500ml' required value={productForm.unit}
                                            onChange={e => setProductForm(p=>({...p,unit:e.target.value}))}
                                            className='mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500 placeholder-slate-600'/>
                                    </div>
                                    <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                        <label className='text-[10px] font-black text-slate-500 uppercase tracking-wider'>Stock *</label>
                                        <input type='number' placeholder='50' required value={productForm.stock}
                                            onChange={e => setProductForm(p=>({...p,stock:e.target.value}))}
                                            className='mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500 placeholder-slate-600'/>
                                    </div>
                                </div>
                                <div className='bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4'>
                                    <p className='text-[10px] font-black text-emerald-400 uppercase tracking-wider mb-3'>Pricing Setup</p>
                                    <div className='grid grid-cols-2 gap-3'>
                                        <div>
                                            <label className='text-[10px] font-black text-slate-500 uppercase'>Your Price *</label>
                                            <div className='relative mt-1.5'>
                                                <span className='absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-500 text-sm'>₹</span>
                                                <input type='number' placeholder='200' required value={productForm.sellerPrice}
                                                    onChange={e => setProductForm(p=>({...p,sellerPrice:e.target.value}))}
                                                    className='w-full bg-slate-800 border border-slate-700 rounded-xl pl-7 pr-3 py-2.5 text-sm font-bold text-white outline-none focus:border-emerald-500 placeholder-slate-600'/>
                                            </div>
                                        </div>
                                        <div>
                                            <label className='text-[10px] font-black text-slate-500 uppercase'>Snapit Margin</label>
                                            <div className='relative mt-1.5'>
                                                <span className='absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-500 text-sm'>₹</span>
                                                <input type='number' placeholder='10' value={productForm.snapitMargin}
                                                    onChange={e => setProductForm(p=>({...p,snapitMargin:e.target.value}))}
                                                    className='w-full bg-slate-800 border border-slate-700 rounded-xl pl-7 pr-3 py-2.5 text-sm font-bold text-white outline-none focus:border-emerald-500 placeholder-slate-600'/>
                                            </div>
                                        </div>
                                    </div>
                                    <div className='mt-3 bg-slate-800 rounded-xl p-3 flex justify-between items-center border border-emerald-500/30'>
                                        <p className='text-[10px] font-black text-slate-400 uppercase'>MRP (Customer Pays)</p>
                                        <p className='text-2xl font-black text-emerald-400'>{fmtINR(sellingPrice)}</p>
                                    </div>
                                    <div className='mt-2'>
                                        <label className='text-[10px] font-black text-slate-500 uppercase'>Discount %</label>
                                        <input type='number' placeholder='0' value={productForm.discount}
                                            onChange={e => setProductForm(p=>({...p,discount:e.target.value}))}
                                            className='mt-1.5 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500 placeholder-slate-600'/>
                                        {Number(productForm.discount) > 0 && sellingPrice > 0 && (
                                            <div className='mt-2 bg-violet-500/10 border border-violet-500/20 rounded-xl px-3 py-2 flex justify-between items-center'>
                                                <div>
                                                    <p className='text-[10px] font-black text-violet-400 uppercase'>Customer Pays After Discount</p>
                                                    <p className='text-[9px] text-slate-600 line-through'>{fmtINR(sellingPrice)}</p>
                                                </div>
                                                <p className='text-sm font-black text-violet-300'>{fmtINR(sellingPrice * (1 - Number(productForm.discount)/100))}</p>
                                            </div>
                                        )}
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

                {/* ══════════ SALES TAB ══════════ */}
                {activeTab === 'sales' && (
                    <div className='flex flex-col gap-5'>
                        <div className='flex gap-2 flex-wrap'>
                            {[{key:'today',label:'Today'},{key:'week',label:'This Week'},{key:'month',label:'This Month'},{key:'all',label:'All Time'}].map(f => (
                                <button key={f.key} onClick={() => setSalesFilter(f.key)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
                                        salesFilter === f.key
                                            ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20'
                                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                                    }`}>{f.label}</button>
                            ))}
                        </div>

                        {/* SUMMARY CARDS */}
                        <div>
                            <div className='flex items-center gap-2 mb-3'>
                                <div className='w-1 h-4 bg-orange-500 rounded-full'/>
                                <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Sales Summary</p>
                            </div>
                            <div className='bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20 rounded-2xl p-5 mb-3'>
                                <p className='text-[9px] font-black text-orange-400/60 uppercase tracking-widest mb-1'>Total Gross Revenue</p>
                                <p className='text-4xl font-black text-white'>{fmtINR(salesTotalGross)}</p>
                                <p className='text-[10px] text-slate-500 mt-1'>{salesFilteredOrders.length} delivered orders</p>
                            </div>
                            <div className='grid grid-cols-2 gap-3 mb-4'>
                                {[
                                    { label:'Your Earning',         val:fmtINR(salesTotalSeller),   sub:'your price × qty',      color:'text-emerald-400', bg:'bg-emerald-500/10 border-emerald-500/20' },
                                    { label:'Snapit Platform Cut',  val:fmtINR(salesTotalSnapit),   sub:'margin you set',         color:'text-amber-400',   bg:'bg-amber-500/10 border-amber-500/20' },
                                    { label:'Delivery to Riders',   val:fmtINR(salesTotalDelivery), sub:'not your money',         color:'text-red-400',     bg:'bg-slate-900 border-slate-800' },
                                    { label:'Avg Per Order',        val:fmtINR(salesFilteredOrders.length > 0 ? salesTotalGross / salesFilteredOrders.length : 0), sub:'per order gross', color:'text-sky-400', bg:'bg-slate-900 border-slate-800' },
                                ].map(s => (
                                    <div key={s.label} className={`${s.bg} border rounded-2xl p-4`}>
                                        <p className='text-[9px] font-black text-slate-500 uppercase tracking-wider'>{s.label}</p>
                                        <p className={`text-xl font-black mt-1 ${s.color}`}>{s.val}</p>
                                        <p className='text-[9px] text-slate-600 mt-0.5'>{s.sub}</p>
                                    </div>
                                ))}
                            </div>
                            <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                <p className='text-[10px] font-black text-slate-500 uppercase tracking-wider mb-3'>Where Every Rupee Went</p>
                                <div className='space-y-2.5'>
                                    <div className='flex justify-between items-center'>
                                        <div className='flex items-center gap-2'>
                                            <div className='w-2 h-2 bg-sky-400 rounded-full'/>
                                            <div>
                                                <p className='text-xs font-bold text-slate-300'>Customer Paid (Gross)</p>
                                                <p className='text-[9px] text-slate-600'>products + delivery</p>
                                            </div>
                                        </div>
                                        <p className='text-sm font-black text-white'>{fmtINR(salesTotalGross)}</p>
                                    </div>
                                    <div className='flex justify-between items-center pl-4 border-l-2 border-red-500/30'>
                                        <div className='flex items-center gap-1.5'>
                                            <HiOutlineTruck size={11} className='text-red-400'/>
                                            <div>
                                                <p className='text-xs text-red-400'>Delivery → Riders</p>
                                                <p className='text-[9px] text-slate-600'>not your money</p>
                                            </div>
                                        </div>
                                        <p className='text-sm font-black text-red-400'>−{fmtINR(salesTotalDelivery)}</p>
                                    </div>
                                    <div className='flex justify-between items-center pl-4 border-l-2 border-amber-500/30'>
                                        <div>
                                            <p className='text-xs text-amber-400'>Snapit Platform Cut</p>
                                            <p className='text-[9px] text-slate-600'>margin you set</p>
                                        </div>
                                        <p className='text-sm font-black text-amber-400'>−{fmtINR(salesTotalSnapit)}</p>
                                    </div>
                                    <div className='flex justify-between items-center pt-2.5 border-t border-slate-700 bg-emerald-500/5 rounded-xl px-3 py-2.5'>
                                        <div className='flex items-center gap-2'>
                                            <div className='w-2 h-2 bg-emerald-400 rounded-full'/>
                                            <div>
                                                <p className='text-sm font-black text-emerald-400'>💰 Your Net Earning</p>
                                                <p className='text-[9px] text-emerald-700'>your price × qty, all orders</p>
                                            </div>
                                        </div>
                                        <p className='text-2xl font-black text-emerald-400'>{fmtINR(salesTotalSeller)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* PRODUCT LIST WITH DISCOUNTS */}
                        <div>
                            <div className='flex items-center gap-2 mb-3'>
                                <div className='w-1 h-4 bg-sky-500 rounded-full'/>
                                <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Product Prices &amp; Discounts</p>
                            </div>
                            {salesProductList.length === 0 ? (
                                <div className='bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center'>
                                    <p className='text-slate-500 text-sm font-bold'>No products sold in this period</p>
                                </div>
                            ) : (
                                <div className='flex flex-col gap-3'>
                                    {salesProductList.map(([name, data]) => {
                                        const pid          = data.pid;
                                        const isEditing    = pid && !!editingProductPrice[pid];
                                        const editData     = editingProductPrice[pid] || {};
                                        const previewMRP   = isEditing
                                            ? (Number(editData.sellerPrice||0) + Number(editData.snapitMargin||0))
                                            : data.mrp;
                                        const previewDisc  = isEditing ? Number(editData.discount||0) : data.discount;
                                        const previewFinal = previewDisc > 0 ? previewMRP * (1 - previewDisc / 100) : previewMRP;

                                        return (
                                            <div key={name} className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                                <div className='flex justify-between items-start mb-3'>
                                                    <p className='text-sm font-black text-white truncate max-w-[60%]'>{name}</p>
                                                    <span className='text-[10px] font-black bg-slate-800 text-slate-400 px-2 py-0.5 rounded-lg'>×{data.qty} sold</span>
                                                </div>
                                                <div className='flex items-center gap-1.5 flex-wrap mb-2.5'>
                                                    <div className='bg-slate-800 rounded-xl px-3 py-2 text-center'>
                                                        <p className='text-[8px] font-black text-slate-500 uppercase'>Your Price</p>
                                                        <p className='text-sm font-black text-emerald-400'>{fmtINR(data.sellerPrice)}</p>
                                                    </div>
                                                    <span className='text-slate-600 text-xs'>+</span>
                                                    <div className='bg-slate-800 rounded-xl px-3 py-2 text-center'>
                                                        <p className='text-[8px] font-black text-slate-500 uppercase'>Margin</p>
                                                        <p className='text-sm font-black text-amber-400'>{fmtINR(data.snapitMargin)}</p>
                                                    </div>
                                                    <span className='text-slate-600 text-xs'>=</span>
                                                    <div className='bg-slate-800 rounded-xl px-3 py-2 text-center'>
                                                        <p className='text-[8px] font-black text-slate-500 uppercase'>MRP</p>
                                                        <p className={`text-sm font-black ${data.discount > 0 ? 'text-slate-500 line-through' : 'text-sky-400'}`}>{fmtINR(data.mrp)}</p>
                                                    </div>
                                                </div>
                                                <div className='flex gap-2 flex-wrap mb-3'>
                                                    {data.discount > 0 && (
                                                        <div className='flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 rounded-xl px-3 py-1.5'>
                                                            <HiOutlineTag size={11} className='text-violet-400'/>
                                                            <p className='text-[10px] font-black text-violet-400'>{data.discount}% OFF active</p>
                                                        </div>
                                                    )}
                                                    <div className='flex items-center gap-2 bg-sky-500/15 border border-sky-400/30 rounded-xl px-3 py-1.5'>
                                                        <HiOutlineCash size={13} className='text-sky-300'/>
                                                        <div>
                                                            <p className='text-[8px] font-black text-sky-400/70 uppercase leading-none'>
                                                                {data.discount > 0 ? 'Customer Paid (after discount)' : 'Customer Paid'}
                                                            </p>
                                                            <p className='text-base font-black text-sky-300 leading-tight'>
                                                                {fmtINR(data.discount > 0 ? data.afterDiscount : data.mrp)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className='pt-2.5 border-t border-slate-800 flex justify-between items-center mb-3'>
                                                    <div>
                                                        <p className='text-[10px] font-black text-slate-500 uppercase'>Your Revenue (period)</p>
                                                        <p className='text-[9px] text-slate-600'>{fmtINR(data.sellerPrice)} × {data.qty} sold</p>
                                                    </div>
                                                    <p className='text-sm font-black text-emerald-400'>{fmtINR(data.sellerRevenue)}</p>
                                                </div>
                                                {!pid ? (
                                                    <p className='text-[10px] text-slate-600 italic'>Product ID unavailable — refresh orders</p>
                                                ) : !isEditing ? (
                                                    <button
                                                        onClick={() => setEditingProductPrice(p => ({
                                                            ...p,
                                                            [pid]: { sellerPrice: data.sellerPrice, snapitMargin: data.snapitMargin, discount: data.discount }
                                                        }))}
                                                        className='w-full flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-black py-2 rounded-xl transition-all'>
                                                        <MdEdit size={13}/> Edit Price / Discount
                                                    </button>
                                                ) : (
                                                    <div className='bg-slate-800/60 border border-sky-500/20 rounded-xl p-3'>
                                                        <p className='text-[9px] font-black text-sky-400 uppercase tracking-wider mb-2.5'>Update Price</p>
                                                        <div className='grid grid-cols-3 gap-2 mb-2'>
                                                            <div>
                                                                <p className='text-[8px] font-black text-slate-500 uppercase mb-1'>Your Price ₹</p>
                                                                <input type='number' value={editData.sellerPrice}
                                                                    onChange={e => setEditingProductPrice(p => ({ ...p, [pid]: { ...p[pid], sellerPrice: e.target.value } }))}
                                                                    className='w-full text-xs bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1.5 outline-none focus:border-sky-500'/>
                                                            </div>
                                                            <div>
                                                                <p className='text-[8px] font-black text-slate-500 uppercase mb-1'>Margin ₹</p>
                                                                <input type='number' value={editData.snapitMargin}
                                                                    onChange={e => setEditingProductPrice(p => ({ ...p, [pid]: { ...p[pid], snapitMargin: e.target.value } }))}
                                                                    className='w-full text-xs bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1.5 outline-none focus:border-sky-500'/>
                                                            </div>
                                                            <div>
                                                                <p className='text-[8px] font-black text-slate-500 uppercase mb-1'>Disc %</p>
                                                                <input type='number' value={editData.discount}
                                                                    onChange={e => setEditingProductPrice(p => ({ ...p, [pid]: { ...p[pid], discount: e.target.value } }))}
                                                                    className='w-full text-xs bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1.5 outline-none focus:border-sky-500'/>
                                                            </div>
                                                        </div>
                                                        <div className='bg-slate-900 rounded-lg px-3 py-2 flex items-center justify-between mb-2.5 border border-sky-500/20'>
                                                            <p className='text-[9px] font-black text-slate-500 uppercase'>Customer Will Pay</p>
                                                            <div className='flex items-center gap-2'>
                                                                {previewDisc > 0 && <span className='text-[10px] text-slate-500 line-through'>{fmtINR(previewMRP)}</span>}
                                                                <p className='text-base font-black text-sky-300'>{fmtINR(previewFinal)}</p>
                                                                {previewDisc > 0 && <span className='text-[9px] font-black bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-md'>{previewDisc}% off</span>}
                                                            </div>
                                                        </div>
                                                        <div className='flex gap-2'>
                                                            <button onClick={() => handleUpdateCustomerPrice(pid, name)} disabled={updatingPrice[pid]}
                                                                className='flex-1 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-black py-2 rounded-xl transition-all'>
                                                                {updatingPrice[pid] ? 'Saving...' : '✓ Apply Price'}
                                                            </button>
                                                            <button onClick={() => setEditingProductPrice(p => { const n = { ...p }; delete n[pid]; return n; })}
                                                                className='px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-black py-2 rounded-xl transition-all'>
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* ORDER HISTORY */}
                        <div>
                            <div className='flex items-center gap-2 mb-3'>
                                <div className='w-1 h-4 bg-emerald-500 rounded-full'/>
                                <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Order History</p>
                            </div>
                            <div className='relative mb-3'>
                                <IoSearchOutline size={16} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500'/>
                                <input value={salesOrderSearch} onChange={e => setSalesOrderSearch(e.target.value)}
                                    placeholder='Search by order ID or product...'
                                    className='w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-200 focus:outline-none focus:border-orange-500 placeholder-slate-600'/>
                                {salesOrderSearch && (
                                    <button onClick={() => setSalesOrderSearch('')} className='absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-lg'>×</button>
                                )}
                            </div>
                            <div className='flex justify-between items-center mb-3'>
                                <p className='text-[11px] text-slate-600 font-bold'>{salesOrderHistory.length} orders</p>
                                <button onClick={() => exportCSV(salesOrderHistory)}
                                    className='flex items-center gap-1.5 text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg'>
                                    <HiOutlineDownload size={12}/> Export CSV
                                </button>
                            </div>
                            {salesOrderHistory.length === 0 ? (
                                <div className='bg-slate-900 rounded-3xl p-14 text-center border-2 border-dashed border-slate-700'>
                                    <p className='text-4xl mb-3'>📭</p>
                                    <p className='font-black text-white'>No orders found</p>
                                </div>
                            ) : salesOrderHistory.map(order => (
                                <div key={order._id} className='bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-3 last:mb-0'>
                                    <div className='flex justify-between items-center p-4 cursor-pointer hover:bg-slate-800/50 transition-all'
                                        onClick={() => setExpandedSalesOrder(expandedSalesOrder === order._id ? null : order._id)}>
                                        <div>
                                            <div className='flex items-center gap-2'>
                                                <p className='font-mono text-xs font-bold text-white'>{order.orderId}</p>
                                                {order.payment_status === 'CASH ON DELIVERY'
                                                    ? <span className='text-[9px] font-black bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-md'>COD</span>
                                                    : <span className='text-[9px] font-black bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-md'>Paid</span>
                                                }
                                            </div>
                                            <p className='text-[10px] text-slate-500 mt-0.5'>
                                                {new Date(order.createdAt).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                                            </p>
                                        </div>
                                        <div className='flex items-center gap-2'>
                                            <div className='text-right'>
                                                <p className='text-xs font-black text-emerald-400'>{fmtINR(getSellerEarning(order))}</p>
                                                <p className='text-[9px] text-slate-600'>your earning</p>
                                            </div>
                                            <span className={`text-slate-500 text-sm transition-transform inline-block ${expandedSalesOrder === order._id ? 'rotate-180' : ''}`}>▼</span>
                                        </div>
                                    </div>
                                    {expandedSalesOrder === order._id && (
                                        <div className='border-t border-slate-800 p-4 bg-slate-800/30'>
                                            <p className='text-[9px] font-black text-slate-500 uppercase mb-3'>Items Sold</p>
                                            {(order.cartItems || []).map((item, i) => {
                                                const sp     = getItemSellerPrice(item);
                                                const margin = getItemSnapitMargin(item);
                                                const disc   = getItemDiscount(item);
                                                const qty    = Number(item.quantity) || 1;
                                                const mrp    = sp + margin;
                                                const paid   = disc > 0 ? mrp * (1 - disc / 100) : mrp;
                                                return (
                                                    <div key={i} className='mb-3 last:mb-0 pb-3 last:pb-0 border-b border-slate-700/50 last:border-0'>
                                                        <div className='flex justify-between items-center mb-1.5'>
                                                            <p className='text-sm font-bold text-slate-200'>{item.productId?.name || item.name}</p>
                                                            <span className='text-[10px] font-black text-slate-500'>×{qty}</span>
                                                        </div>
                                                        <div className='flex gap-2 flex-wrap'>
                                                            <span className='text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg'>Your {fmtINR(sp)}</span>
                                                            {margin > 0 && <span className='text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-lg'>+Margin {fmtINR(margin)}</span>}
                                                            {disc > 0 ? (
                                                                <>
                                                                    <span className='text-[10px] bg-slate-700 text-slate-500 px-2 py-0.5 rounded-lg line-through'>MRP {fmtINR(mrp)}</span>
                                                                    <span className='text-[10px] font-black bg-sky-500/20 text-sky-200 border border-sky-400/30 px-2 py-0.5 rounded-lg'>
                                                                        Customer Paid {fmtINR(paid)} ({disc}% off)
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className='text-[10px] font-black bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-lg'>Customer Paid {fmtINR(mrp)}</span>
                                                            )}
                                                        </div>
                                                        <p className='text-[10px] text-slate-600 mt-1'>
                                                            Your earning: <span className='text-emerald-400 font-black'>{fmtINR(sp*qty)}</span>
                                                            {margin > 0 && <> · Snapit cut: <span className='text-amber-400 font-black'>{fmtINR(margin*qty)}</span></>}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                            <OrderMoneyBreakdown order={order} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ══════════ HISTORY TAB ══════════ */}
                {activeTab === 'history' && (
                    <div className='flex flex-col gap-4'>
                        <div className='grid grid-cols-2 gap-3'>
                            {[
                                { label:'Total Orders',  val:allSorted.length,           color:'text-white' },
                                { label:'Delivered',     val:deliveredCount,              color:'text-emerald-400' },
                                { label:'All Earnings',  val:fmtINRShort(allTimeEarning), color:'text-sky-400', sub:'your price × qty' },
                                { label:'Cancelled',     val:cancelledCount,              color:'text-red-400' },
                            ].map(s => (
                                <div key={s.label} className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                    <p className='text-[10px] font-black text-slate-500 uppercase'>{s.label}</p>
                                    <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.val}</p>
                                    {s.sub && <p className='text-[10px] text-slate-600'>{s.sub}</p>}
                                </div>
                            ))}
                        </div>
                        <div className='relative'>
                            <IoSearchOutline size={16} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500'/>
                            <input value={historySearch} onChange={e => setHistorySearch(e.target.value)}
                                placeholder='Search by order ID or product...'
                                className='w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-200 focus:outline-none focus:border-orange-500 placeholder-slate-600'/>
                            {historySearch && <button onClick={() => setHistorySearch('')} className='absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-lg'>×</button>}
                        </div>
                        <div className='flex gap-2 flex-wrap items-center'>
                            {[{key:'all',label:'All'},{key:'delivered',label:'✅ Delivered'},{key:'pending',label:'⏳ Pending'},{key:'cancelled',label:'❌ Cancelled'}].map(f => (
                                <button key={f.key} onClick={() => setHistoryFilter(f.key)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
                                        historyFilter === f.key ? 'bg-orange-500 text-white border-orange-500' : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                                    }`}>{f.label}</button>
                            ))}
                            <button onClick={() => exportCSV(historyFiltered)}
                                className='ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-slate-900 text-emerald-400 border border-emerald-500/30 hover:bg-slate-800 transition-all'>
                                <HiOutlineDownload size={14}/> Export CSV
                            </button>
                        </div>
                        <p className='text-[11px] text-slate-600 font-bold'>{historyFiltered.length} of {allSorted.length} orders{historySearch && ` · "${historySearch}"`}</p>
                        {historyFiltered.length === 0 ? (
                            <div className='bg-slate-900 rounded-3xl p-14 text-center border-2 border-dashed border-slate-700'>
                                <p className='text-4xl mb-3'>📭</p>
                                <p className='font-black text-white'>No orders found</p>
                            </div>
                        ) : historyFiltered.map(order => (
                            <div key={order._id} className='bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden'>
                                <div className='flex justify-between items-center p-4 cursor-pointer hover:bg-slate-800/50 transition-all'
                                    onClick={() => setExpandedOrder(expandedOrder === order._id ? null : order._id)}>
                                    <div>
                                        <p className='font-mono text-xs font-bold text-white'>{order.orderId}</p>
                                        <p className='text-[10px] text-slate-500 mt-0.5'>{new Date(order.createdAt).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</p>
                                    </div>
                                    <div className='flex items-center gap-2'>
                                        <StatusBadge status={order.delivery_status}/>
                                        <span className={`text-slate-500 text-sm transition-transform ${expandedOrder === order._id ? 'rotate-180' : ''}`}>▼</span>
                                    </div>
                                </div>
                                {expandedOrder === order._id && (
                                    <div className='border-t border-slate-800 p-4 bg-slate-800/30'>
                                        <p className='text-[9px] font-black text-slate-500 uppercase mb-3'>Items</p>
                                        {(order.cartItems||[]).map((item, i) => {
                                            const sp     = getItemSellerPrice(item);
                                            const margin = getItemSnapitMargin(item);
                                            const disc   = getItemDiscount(item);
                                            const qty    = Number(item.quantity)||1;
                                            const mrp    = sp + margin;
                                            const paid   = disc > 0 ? mrp * (1 - disc/100) : mrp;
                                            return (
                                                <div key={i} className='flex justify-between items-start py-2 border-b border-slate-700/50 last:border-0'>
                                                    <div>
                                                        <p className='text-sm font-bold text-slate-200'>{item.productId?.name || item.name}</p>
                                                        <div className='flex gap-2 mt-0.5 flex-wrap'>
                                                            <span className='text-[10px] text-emerald-400'>Your {fmtINR(sp)}</span>
                                                            {disc > 0
                                                                ? <span className='text-[10px] text-sky-400'>Customer {fmtINR(paid)} ({disc}% off)</span>
                                                                : <span className='text-[10px] text-sky-400'>Customer {fmtINR(mrp)}</span>
                                                            }
                                                        </div>
                                                    </div>
                                                    <div className='text-right'>
                                                        <p className='text-xs text-slate-400'>×{qty}</p>
                                                        <p className='text-sm font-black text-emerald-400'>{fmtINR(sp*qty)}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <OrderMoneyBreakdown order={order} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* ══════════ EARNINGS TAB ══════════ */}
                {activeTab === 'earnings' && (
                    <div className='flex flex-col gap-4'>
                        <div className='flex gap-2 flex-wrap'>
                            {[{key:'today',label:'Today'},{key:'week',label:'This Week'},{key:'month',label:'This Month'},{key:'all',label:'All Time'}].map(f => (
                                <button key={f.key} onClick={() => setEarningFilter(f.key)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
                                        earningFilter === f.key ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                                    }`}>{f.label}</button>
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
                                <div className='bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6'>
                                    <p className='text-[9px] font-black text-emerald-400/60 uppercase tracking-widest mb-1'>Your Store Earnings</p>
                                    <p className='text-4xl font-black text-emerald-400'>{fmtINR(totalSellerEarning)}</p>
                                    <p className='text-[9px] text-emerald-700 mt-0.5'>your price × qty, all delivered orders</p>
                                    <div className='grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-emerald-500/20'>
                                        <div><p className='text-[9px] text-emerald-400/50 uppercase font-bold'>Gross (incl. delivery)</p><p className='text-sm font-black text-white'>{fmtINR(totalGross)}</p></div>
                                        <div><p className='text-[9px] text-red-400/70 uppercase font-bold'>Delivery → Riders</p><p className='text-sm font-black text-red-400'>−{fmtINR(totalDelivery)}</p></div>
                                        {totalSnapitEarning > 0 && <div><p className='text-[9px] text-amber-400/60 uppercase font-bold'>Snapit Platform Cut</p><p className='text-sm font-black text-amber-400'>−{fmtINR(totalSnapitEarning)}</p></div>}
                                        <div><p className='text-[9px] text-emerald-400/50 uppercase font-bold'>Orders Delivered</p><p className='text-sm font-black text-white'>{totalOrders}</p></div>
                                        <div><p className='text-[9px] text-emerald-400/50 uppercase font-bold'>Avg Earning / Order</p><p className='text-sm font-black text-white'>{fmtINR(avgNet)}</p></div>
                                    </div>
                                </div>
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
                                                        <div className={`${colors[i%colors.length]} h-2 rounded-full transition-all duration-700`} style={{ width:`${pct.toFixed(1)}%` }}/>
                                                    </div>
                                                    <p className='text-[9px] text-slate-600 mt-0.5'>{pct.toFixed(1)}% of your earnings</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                    <div className='flex items-center justify-between mb-4'>
                                        <p className='text-xs font-black text-white uppercase tracking-wider'>Daily Breakdown</p>
                                        <button onClick={() => exportCSV(filteredEarnings)}
                                            className='flex items-center gap-1.5 text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg'>
                                            <HiOutlineDownload size={12}/> CSV
                                        </button>
                                    </div>
                                    {Object.entries(byDate).sort((a,b) => new Date(b[0]) - new Date(a[0])).map(([date, d]) => (
                                        <div key={date} className='py-3 border-b border-slate-800 last:border-0'>
                                            <div className='flex justify-between items-center'>
                                                <p className='text-sm font-bold text-slate-200'>{date}</p>
                                                <p className='font-black text-emerald-400'>{fmtINR(d.sellerNet)}</p>
                                            </div>
                                            <div className='flex gap-3 mt-1 flex-wrap'>
                                                <p className='text-[10px] text-slate-600'>{d.count} order{d.count>1?'s':''}</p>
                                                <p className='text-[10px] text-slate-500'>Gross {fmtINR(d.gross)}</p>
                                                {d.delivery > 0 && <p className='text-[10px] text-red-400'>Delivery −{fmtINR(d.delivery)}</p>}
                                                {d.snapit > 0 && <p className='text-[10px] text-amber-400'>Snapit −{fmtINR(d.snapit)}</p>}
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