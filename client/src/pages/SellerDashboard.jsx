import React, { useEffect, useState } from 'react';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { FaCloudUploadAlt } from 'react-icons/fa';
import { MdDelete } from 'react-icons/md';
import { IoClose } from 'react-icons/io5';

const SellerDashboard = () => {
    const [allOrders, setAllOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('packing');
    const [earningFilter, setEarningFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [historySearch, setHistorySearch] = useState('');
    const [historyFilter, setHistoryFilter] = useState('all');

    // ── PRODUCTS STATE ─────────────────────────────────────────
    const [productTab, setProductTab] = useState('list'); // 'list' | 'upload'
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);
    const [editingStock, setEditingStock] = useState({}); // { [productId]: newStockValue }
    const [productForm, setProductForm] = useState({
        name: '', description: '', image: [], category: [],
        subCategory: [], unit: '', stock: '', sellerPrice: '',
        snapitMargin: '', discount: '',
    });
    const [selectCategory, setSelectCategory] = useState('');
    const [selectSubCategory, setSelectSubCategory] = useState('');

    const allCategory = useSelector(state => state.product.allCategory);
    const allSubCategory = useSelector(state => state.product.allSubCategory);
    const user = useSelector(state => state.user);

    const sellingPrice = Number(productForm.sellerPrice || 0) + Number(productForm.snapitMargin || 0);

    // ── FETCH ORDERS ───────────────────────────────────────────
    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await Axios({ ...SummaryApi.getSellerOrders });
            if (response.data.success) {
                const data = Array.isArray(response.data.data) ? response.data.data : [];
                setAllOrders(data);
            }
        } catch (error) {
            toast.error('Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    };

    // ── FETCH PRODUCTS ─────────────────────────────────────────
    const fetchProducts = async () => {
        setProductsLoading(true);
        try {
            const response = await Axios({ ...SummaryApi.getProduct, data: { page: 1, limit: 100 } });
            if (response.data.success) {
                setProducts(Array.isArray(response.data.data) ? response.data.data : []);
            }
        } catch (error) {
            toast.error('Failed to fetch products');
        } finally {
            setProductsLoading(false);
        }
    };

    const markAsReady = async (orderId) => {
        try {
            const response = await Axios({
                ...SummaryApi.updateSellerStatus,
                data: { orderId, sellerStatus: 'Ready for Pickup' }
            });
            if (response.data.success) {
                toast.success('Rider Notified! Order ready for pickup.');
                fetchOrders();
            }
        } catch (error) {
            toast.error('Failed to update order');
        }
    };

    // ── UPLOAD IMAGE ───────────────────────────────────────────
    const handleUploadImage = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageLoading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            const response = await Axios({ ...SummaryApi.uploadImage, data: formData });
            const imageUrl = response.data?.data?.url;
            if (imageUrl) {
                setProductForm(prev => ({ ...prev, image: [...prev.image, imageUrl] }));
                toast.success('Image uploaded!');
            }
        } catch (error) {
            toast.error('Image upload failed');
        } finally {
            setImageLoading(false);
        }
    };

    // ── SUBMIT NEW PRODUCT ─────────────────────────────────────
    const handleProductSubmit = async (e) => {
        e.preventDefault();
        const sellerP = Number(productForm.sellerPrice) || 0;
        const margin  = Number(productForm.snapitMargin) || 0;
        const payload = {
            ...productForm,
            category    : productForm.category.map(c => c._id),
            subCategory : productForm.subCategory.map(s => s._id),
            sellerPrice : sellerP,
            snapitMargin: margin,
            sellingPrice: sellerP + margin,
            price       : sellerP + margin,
        };
        try {
            const response = await Axios({ ...SummaryApi.createProduct, data: payload });
            if (response.data.success) {
                toast.success('Product uploaded successfully!');
                setProductForm({
                    name: '', description: '', image: [], category: [],
                    subCategory: [], unit: '', stock: '', sellerPrice: '',
                    snapitMargin: '', discount: '',
                });
                setProductTab('list');
                fetchProducts();
            }
        } catch (error) {
            toast.error('Failed to upload product');
        }
    };

    // ── UPDATE STOCK ───────────────────────────────────────────
    const handleUpdateStock = async (productId) => {
        const newStock = editingStock[productId];
        if (newStock === undefined || newStock === '') return;
        try {
            const response = await Axios({
                ...SummaryApi.updateProductDetails,
                data: { _id: productId, stock: Number(newStock) }
            });
            if (response.data.success) {
                toast.success('Stock updated!');
                setEditingStock(prev => { const n = { ...prev }; delete n[productId]; return n; });
                fetchProducts();
            }
        } catch (error) {
            toast.error('Stock update failed');
        }
    };

    // ── DELETE PRODUCT ─────────────────────────────────────────
    const handleDeleteProduct = async (productId) => {
        if (!window.confirm('Delete this product?')) return;
        try {
            const response = await Axios({ ...SummaryApi.deleteProduct, data: { _id: productId } });
            if (response.data.success) {
                toast.success('Product deleted');
                fetchProducts();
            }
        } catch (error) {
            toast.error('Delete failed');
        }
    };

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (activeTab === 'products') fetchProducts();
    }, [activeTab]);

    const now = new Date();
    const isDelivered = (order) => (order.delivery_status || '').trim().toLowerCase() === 'delivered';
    const packingOrders = allOrders.filter(o =>
        o.seller_status !== 'Ready for Pickup' &&
        o.delivery_status !== 'Delivered' &&
        o.delivery_status !== 'Cancelled'
    );
    const pendingCount = allOrders.filter(o =>
        o.delivery_status === 'Pending' && o.seller_status !== 'Ready for Pickup'
    ).length;
    const packingCount = allOrders.filter(o => o.seller_status === 'Packing').length;

    const filterByDate = (list) => list.filter(o => {
        if (!isDelivered(o)) return false;
        const created = new Date(o.createdAt);
        if (earningFilter === 'today') return created.toDateString() === now.toDateString();
        if (earningFilter === 'week') { const w = new Date(now); w.setDate(now.getDate() - 7); return created >= w; }
        if (earningFilter === 'month') return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        return true;
    });

    const filteredEarnings   = filterByDate(allOrders);
    const getOrderAmount     = (o) => Number(o.totalAmt ?? o.total_amount ?? o.amount ?? o.subTotalAmt ?? 0);
    const getDeliveryFee     = (o) => Number(o.delivery_fee ?? o.deliveryFee ?? o.delivery_charge ?? 0);
    const getSellerEarning   = (order) => (order.cartItems || []).reduce((acc, item) => acc + Number(item.sellerPrice ?? item.price ?? 0) * (Number(item.quantity) || 1), 0);
    const getSnapitEarning   = (order) => (order.cartItems || []).reduce((acc, item) => acc + Number(item.snapitMargin ?? 0) * (Number(item.quantity) || 1), 0);
    const totalGross         = filteredEarnings.reduce((a, o) => a + getOrderAmount(o), 0);
    const totalDelivery      = filteredEarnings.reduce((a, o) => a + getDeliveryFee(o), 0);
    const totalSellerEarning = filteredEarnings.reduce((a, o) => a + getSellerEarning(o), 0);
    const totalSnapitEarning = filteredEarnings.reduce((a, o) => a + getSnapitEarning(o), 0);
    const totalOrders        = filteredEarnings.length;
    const avgNet             = totalOrders > 0 ? Math.round(totalSellerEarning / totalOrders) : 0;

    const productEarnings = filteredEarnings.reduce((acc, order) => {
        (order.cartItems || []).forEach(item => {
            const name = item.productId?.name || item.name || 'Unknown Product';
            const qty = Number(item.quantity) || 1;
            const sellerPrice = Number(item.sellerPrice ?? item.price ?? 0);
            if (!acc[name]) acc[name] = { qty: 0, revenue: 0 };
            acc[name].qty += qty;
            acc[name].revenue += sellerPrice * qty;
        });
        return acc;
    }, {});
    const productList = Object.entries(productEarnings).sort((a, b) => b[1].revenue - a[1].revenue);

    const byDate = filteredEarnings.reduce((acc, o) => {
        const d = new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        if (!acc[d]) acc[d] = { gross: 0, sellerNet: 0, snapit: 0, delivery: 0, count: 0 };
        acc[d].gross += getOrderAmount(o); acc[d].delivery += getDeliveryFee(o);
        acc[d].sellerNet += getSellerEarning(o); acc[d].snapit += getSnapitEarning(o); acc[d].count += 1;
        return acc;
    }, {});

    const allSorted = [...allOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const historyFiltered = allSorted.filter(order => {
        if (historyFilter === 'delivered' && !isDelivered(order)) return false;
        if (historyFilter === 'pending' && (order.delivery_status || '').toLowerCase() !== 'pending') return false;
        if (historyFilter === 'cancelled' && (order.delivery_status || '').toLowerCase() !== 'cancelled') return false;
        if (historySearch.trim()) {
            const q = historySearch.trim().toLowerCase();
            return (order.orderId || '').toLowerCase().includes(q) ||
                (order.cartItems || []).some(item => (item.productId?.name || item.name || '').toLowerCase().includes(q));
        }
        return true;
    });

    const deliveredCount = allOrders.filter(o => isDelivered(o)).length;
    const cancelledCount = allOrders.filter(o => (o.delivery_status || '').toLowerCase() === 'cancelled').length;
    const statusColor = (s) => {
        const st = (s || '').toLowerCase();
        if (st === 'delivered') return 'bg-green-100 text-green-700';
        if (st === 'out for delivery') return 'bg-blue-100 text-blue-700';
        if (st === 'confirmed') return 'bg-purple-100 text-purple-700';
        if (st === 'cancelled') return 'bg-red-100 text-red-700';
        return 'bg-orange-100 text-orange-700';
    };

    if (loading && activeTab !== 'products') return (
        <div className='p-4 bg-orange-50 min-h-screen flex items-center justify-center'>
            <div className='text-center'><p className='text-4xl mb-3'>⏳</p><p className='font-black text-slate-600'>Loading orders...</p></div>
        </div>
    );

    return (
        <div className='p-4 bg-orange-50 min-h-screen max-w-4xl mx-auto'>

            {/* Header */}
            <div className='flex items-center justify-between mb-6'>
                <div>
                    <h1 className='text-2xl font-black text-slate-900'>STORE PANEL</h1>
                    <p className='text-xs text-slate-500 font-bold uppercase tracking-widest'>Snapit — Paliganj</p>
                </div>
                <div className='flex gap-2 items-center'>
                    <button onClick={fetchOrders} className='bg-white rounded-2xl px-3 py-2 shadow-sm border border-orange-100 text-lg'>🔄</button>
                    <div className='bg-white rounded-2xl px-4 py-2 shadow-sm border border-orange-100 text-center'>
                        <p className='text-[10px] font-black text-slate-400 uppercase'>Pending</p>
                        <p className='text-xl font-black text-orange-500'>{pendingCount}</p>
                    </div>
                    <div className='bg-white rounded-2xl px-4 py-2 shadow-sm border border-orange-100 text-center'>
                        <p className='text-[10px] font-black text-slate-400 uppercase'>Packing</p>
                        <p className='text-xl font-black text-blue-500'>{packingCount}</p>
                    </div>
                </div>
            </div>

            {/* Tabs — now 4 tabs */}
            <div className='flex gap-2 mb-6 bg-white rounded-2xl p-1 shadow-sm border border-slate-100'>
                {[
                    { key: 'packing',  label: '📦 Packing',  active: 'bg-orange-500' },
                    { key: 'products', label: '🛍️ Products', active: 'bg-blue-600' },
                    { key: 'history',  label: '🧾 History',  active: 'bg-slate-800' },
                    { key: 'earnings', label: '💰 Earnings', active: 'bg-green-600' },
                ].map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)}
                        className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all ${activeTab === t.key ? t.active + ' text-white shadow' : 'text-slate-500'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── PACKING TAB ── */}
            {activeTab === 'packing' && (
                <div className='grid gap-4'>
                    {packingOrders.length === 0 ? (
                        <div className='bg-white rounded-3xl p-12 text-center border-2 border-dashed border-orange-200'>
                            <p className='text-4xl mb-3'>🎉</p>
                            <p className='font-black text-slate-700'>All orders are packed and with riders! 📦</p>
                            <p className='text-sm text-slate-400 mt-1'>No pending orders right now.</p>
                            <button onClick={fetchOrders} className='mt-4 bg-orange-100 text-orange-600 font-black text-sm px-5 py-2 rounded-full'>Check for new orders</button>
                        </div>
                    ) : packingOrders.map(order => (
                        <div key={order._id} className='bg-white p-6 rounded-3xl shadow-sm border-2 border-orange-100'>
                            <div className='flex justify-between items-center mb-2'>
                                <span className='font-bold text-orange-600 font-mono text-sm'>{order.orderId}</span>
                                <span className='bg-orange-100 px-3 py-1 rounded-full text-xs font-bold'>{order.seller_status || 'New'}</span>
                            </div>
                            {order.store_details?.name && (
                                <div className='flex items-center gap-2 mb-3 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2'>
                                    <span>🏪</span>
                                    <div>
                                        <p className='text-[10px] font-black text-blue-400 uppercase'>Store</p>
                                        <p className='text-sm font-black text-blue-700'>{order.store_details.name}</p>
                                    </div>
                                </div>
                            )}
                            <div className='mb-4'>
                                {(order.cartItems || []).map((item, i) => (
                                    <p key={i} className='font-bold text-slate-700'>• {item.productId?.name || item.name} (×{item.quantity})</p>
                                ))}
                            </div>
                            <div className='flex justify-between items-center mb-4'>
                                <div>
                                    <p className='text-[10px] font-black text-slate-400 uppercase'>Order Total</p>
                                    <p className='text-xl font-black text-slate-900'>₹{getOrderAmount(order)}</p>
                                </div>
                                <div className='text-right'>
                                    <p className='text-[10px] font-black text-slate-400 uppercase'>Payment</p>
                                    <p className='text-sm font-bold text-slate-700'>{order.payment_status || 'COD'}</p>
                                </div>
                            </div>
                            <button onClick={() => markAsReady(order.orderId)}
                                className='w-full bg-orange-500 text-white py-3 rounded-2xl font-black hover:bg-orange-600 transition-all active:scale-95'>
                                PACKED & READY FOR RIDER
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* ── PRODUCTS TAB ── */}
            {activeTab === 'products' && (
                <div>
                    {/* Sub-tabs */}
                    <div className='flex gap-2 mb-4'>
                        <button onClick={() => setProductTab('list')}
                            className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all border ${productTab === 'list' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                            📋 My Products
                        </button>
                        <button onClick={() => setProductTab('upload')}
                            className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all border ${productTab === 'upload' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                            ➕ Upload New
                        </button>
                    </div>

                    {/* ── PRODUCT LIST ── */}
                    {productTab === 'list' && (
                        <div className='flex flex-col gap-3'>
                            {productsLoading ? (
                                <div className='bg-white rounded-3xl p-10 text-center'>
                                    <p className='text-3xl mb-2'>⏳</p>
                                    <p className='font-black text-slate-500'>Loading products...</p>
                                </div>
                            ) : products.length === 0 ? (
                                <div className='bg-white rounded-3xl p-12 text-center border-2 border-dashed border-blue-200'>
                                    <p className='text-4xl mb-3'>📦</p>
                                    <p className='font-black text-slate-700'>No products yet</p>
                                    <button onClick={() => setProductTab('upload')}
                                        className='mt-4 bg-blue-600 text-white font-black text-sm px-5 py-2 rounded-full'>
                                        Upload First Product
                                    </button>
                                </div>
                            ) : products.map(product => (
                                <div key={product._id} className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex gap-4 items-center'>
                                    {/* Image */}
                                    <img
                                        src={product.image?.[0] || ''}
                                        alt={product.name}
                                        className='w-16 h-16 object-contain rounded-xl bg-slate-50 border border-slate-100 flex-shrink-0'
                                    />
                                    {/* Info */}
                                    <div className='flex-1 min-w-0'>
                                        <p className='font-black text-slate-800 text-sm truncate'>{product.name}</p>
                                        <div className='flex gap-3 mt-1 flex-wrap'>
                                            <span className='text-xs text-emerald-600 font-bold'>₹{product.sellerPrice || product.price}</span>
                                            {product.snapitMargin > 0 && (
                                                <span className='text-xs text-yellow-500 font-bold'>+₹{product.snapitMargin} margin</span>
                                            )}
                                            <span className={`text-xs font-bold ${product.stock > 10 ? 'text-green-600' : product.stock > 0 ? 'text-orange-500' : 'text-red-500'}`}>
                                                {product.stock > 0 ? `${product.stock} in stock` : '❌ Out of stock'}
                                            </span>
                                        </div>
                                        {/* Stock editor */}
                                        <div className='flex items-center gap-2 mt-2'>
                                            <input
                                                type='number'
                                                placeholder='New stock'
                                                value={editingStock[product._id] ?? ''}
                                                onChange={e => setEditingStock(prev => ({ ...prev, [product._id]: e.target.value }))}
                                                className='w-24 text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400'
                                            />
                                            <button
                                                onClick={() => handleUpdateStock(product._id)}
                                                disabled={!editingStock[product._id]}
                                                className='text-xs bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 text-white px-3 py-1.5 rounded-lg font-black'>
                                                Update
                                            </button>
                                            <button
                                                onClick={() => handleDeleteProduct(product._id)}
                                                className='text-xs bg-red-50 text-red-500 px-3 py-1.5 rounded-lg font-black hover:bg-red-100'>
                                                <MdDelete size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── UPLOAD FORM ── */}
                    {productTab === 'upload' && (
                        <form onSubmit={handleProductSubmit} className='flex flex-col gap-4'>

                            {/* Name */}
                            <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                                <label className='text-xs font-black text-slate-500 uppercase'>Product Name</label>
                                <input type='text' placeholder='e.g. Basmati Rice 5kg' required
                                    value={productForm.name}
                                    onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))}
                                    className='mt-2 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-400'
                                />
                            </div>

                            {/* Description */}
                            <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                                <label className='text-xs font-black text-slate-500 uppercase'>Description</label>
                                <textarea rows={3} placeholder='Describe the product...' required
                                    value={productForm.description}
                                    onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))}
                                    className='mt-2 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-400 resize-none'
                                />
                            </div>

                            {/* Image Upload */}
                            <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                                <label className='text-xs font-black text-slate-500 uppercase'>Images</label>
                                <label htmlFor='sellerProductImage'
                                    className='mt-2 flex flex-col items-center justify-center h-24 border-2 border-dashed border-blue-200 rounded-xl cursor-pointer hover:border-blue-400 transition-all'>
                                    {imageLoading ? (
                                        <p className='text-sm text-slate-400 animate-pulse'>Uploading...</p>
                                    ) : (
                                        <>
                                            <FaCloudUploadAlt size={28} className='text-blue-400' />
                                            <p className='text-xs font-bold text-slate-400 mt-1'>Tap to upload image</p>
                                        </>
                                    )}
                                    <input id='sellerProductImage' type='file' accept='image/*' className='hidden' onChange={handleUploadImage} />
                                </label>
                                <div className='flex gap-2 flex-wrap mt-2'>
                                    {productForm.image.map((img, i) => (
                                        <div key={i} className='relative w-16 h-16'>
                                            <img src={img} className='w-full h-full object-contain rounded-lg border border-slate-100' />
                                            <button type='button' onClick={() => setProductForm(p => ({ ...p, image: p.image.filter((_, idx) => idx !== i) }))}
                                                className='absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]'>
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Category */}
                            <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                                <label className='text-xs font-black text-slate-500 uppercase'>Category</label>
                                <select value={selectCategory} className='mt-2 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none'
                                    onChange={e => {
                                        const cat = allCategory.find(c => c._id === e.target.value);
                                        if (cat && !productForm.category.some(c => c._id === cat._id)) {
                                            setProductForm(p => ({ ...p, category: [...p.category, cat] }));
                                        }
                                        setSelectCategory('');
                                    }}>
                                    <option value=''>Select Category</option>
                                    {(allCategory || []).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                                <div className='flex flex-wrap gap-2 mt-2'>
                                    {productForm.category.map((c, i) => (
                                        <span key={i} className='flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-full'>
                                            {c.name}
                                            <IoClose className='cursor-pointer' onClick={() => setProductForm(p => ({ ...p, category: p.category.filter((_, idx) => idx !== i) }))} />
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Sub Category */}
                            <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                                <label className='text-xs font-black text-slate-500 uppercase'>Sub Category</label>
                                <select value={selectSubCategory} className='mt-2 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none'
                                    onChange={e => {
                                        const sub = allSubCategory.find(s => s._id === e.target.value);
                                        if (sub && !productForm.subCategory.some(s => s._id === sub._id)) {
                                            setProductForm(p => ({ ...p, subCategory: [...p.subCategory, sub] }));
                                        }
                                        setSelectSubCategory('');
                                    }}>
                                    <option value=''>Select Sub Category</option>
                                    {(allSubCategory || []).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                </select>
                                <div className='flex flex-wrap gap-2 mt-2'>
                                    {productForm.subCategory.map((s, i) => (
                                        <span key={i} className='flex items-center gap-1 bg-purple-50 text-purple-700 text-xs font-bold px-2 py-1 rounded-full'>
                                            {s.name}
                                            <IoClose className='cursor-pointer' onClick={() => setProductForm(p => ({ ...p, subCategory: p.subCategory.filter((_, idx) => idx !== i) }))} />
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Unit + Stock */}
                            <div className='grid grid-cols-2 gap-3'>
                                <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                                    <label className='text-xs font-black text-slate-500 uppercase'>Unit</label>
                                    <input type='text' placeholder='e.g. 1kg, 500ml' required
                                        value={productForm.unit}
                                        onChange={e => setProductForm(p => ({ ...p, unit: e.target.value }))}
                                        className='mt-2 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-400'
                                    />
                                </div>
                                <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                                    <label className='text-xs font-black text-slate-500 uppercase'>Stock</label>
                                    <input type='number' placeholder='e.g. 50' required
                                        value={productForm.stock}
                                        onChange={e => setProductForm(p => ({ ...p, stock: e.target.value }))}
                                        className='mt-2 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-400'
                                    />
                                </div>
                            </div>

                            {/* Pricing */}
                            <div className='bg-green-50 border border-green-200 rounded-2xl p-4'>
                                <p className='text-xs font-black text-green-700 uppercase mb-3'>💰 Pricing</p>
                                <div className='grid grid-cols-2 gap-3'>
                                    <div>
                                        <label className='text-xs font-black text-slate-500 uppercase'>Seller Price</label>
                                        <div className='relative mt-1'>
                                            <span className='absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm'>₹</span>
                                            <input type='number' placeholder='200' required
                                                value={productForm.sellerPrice}
                                                onChange={e => setProductForm(p => ({ ...p, sellerPrice: e.target.value }))}
                                                className='w-full border border-slate-200 rounded-xl pl-7 pr-3 py-2.5 text-sm font-bold outline-none focus:border-green-400 bg-white'
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className='text-xs font-black text-slate-500 uppercase'>Snapit Margin</label>
                                        <div className='relative mt-1'>
                                            <span className='absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm'>₹</span>
                                            <input type='number' placeholder='10'
                                                value={productForm.snapitMargin}
                                                onChange={e => setProductForm(p => ({ ...p, snapitMargin: e.target.value }))}
                                                className='w-full border border-slate-200 rounded-xl pl-7 pr-3 py-2.5 text-sm font-bold outline-none focus:border-green-400 bg-white'
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className='mt-3 bg-white rounded-xl p-3 flex justify-between items-center border-2 border-green-400'>
                                    <p className='text-xs font-black text-slate-500 uppercase'>Customer Pays</p>
                                    <p className='text-2xl font-black text-green-700'>₹{sellingPrice.toFixed(2)}</p>
                                </div>
                            </div>

                            {/* Discount */}
                            <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                                <label className='text-xs font-black text-slate-500 uppercase'>Discount %</label>
                                <input type='number' placeholder='e.g. 10'
                                    value={productForm.discount}
                                    onChange={e => setProductForm(p => ({ ...p, discount: e.target.value }))}
                                    className='mt-2 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-400'
                                />
                            </div>

                            <button type='submit'
                                className='w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg shadow-blue-200'>
                                🚀 UPLOAD PRODUCT
                            </button>
                        </form>
                    )}
                </div>
            )}

            {/* ── HISTORY TAB ── */}
            {activeTab === 'history' && (
                <div className='flex flex-col gap-3'>
                    <div className='grid grid-cols-3 gap-2'>
                        <div className='bg-white rounded-2xl p-3 text-center shadow-sm border border-slate-100'>
                            <p className='text-xl font-black text-slate-800'>{allSorted.length}</p>
                            <p className='text-[10px] font-black text-slate-400 uppercase'>Total</p>
                        </div>
                        <div className='bg-white rounded-2xl p-3 text-center shadow-sm border border-green-100'>
                            <p className='text-xl font-black text-green-600'>{deliveredCount}</p>
                            <p className='text-[10px] font-black text-slate-400 uppercase'>Delivered</p>
                        </div>
                        <div className='bg-white rounded-2xl p-3 text-center shadow-sm border border-red-100'>
                            <p className='text-xl font-black text-red-500'>{cancelledCount}</p>
                            <p className='text-[10px] font-black text-slate-400 uppercase'>Cancelled</p>
                        </div>
                    </div>
                    <div className='relative'>
                        <input type='text' value={historySearch} onChange={e => setHistorySearch(e.target.value)}
                            placeholder='Search by order ID or product name...'
                            className='w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-slate-400 pl-10'
                        />
                        <span className='absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400'>🔍</span>
                        {historySearch && <button onClick={() => setHistorySearch('')} className='absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg'>×</button>}
                    </div>
                    <div className='flex gap-2 flex-wrap'>
                        {[{ key: 'all', label: 'All Orders' }, { key: 'delivered', label: '✅ Delivered' }, { key: 'pending', label: '⏳ Pending' }, { key: 'cancelled', label: '❌ Cancelled' }].map(f => (
                            <button key={f.key} onClick={() => setHistoryFilter(f.key)}
                                className={`px-3 py-1.5 rounded-full text-xs font-black transition-all border ${historyFilter === f.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <p className='text-[11px] text-slate-400 font-bold px-1'>Showing {historyFiltered.length} of {allSorted.length} orders{historySearch && ` · matching "${historySearch}"`}</p>
                    {historyFiltered.length === 0 ? (
                        <div className='bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200'>
                            <p className='text-4xl mb-3'>📭</p>
                            <p className='font-black text-slate-700'>No orders found</p>
                        </div>
                    ) : historyFiltered.map(order => (
                        <div key={order._id} className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                            <div className='flex justify-between items-start mb-2'>
                                <div>
                                    <p className='font-mono text-xs font-bold text-slate-500'>{order.orderId}</p>
                                    <p className='text-[10px] text-slate-400 mt-0.5'>{new Date(order.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${statusColor(order.delivery_status)}`}>{order.delivery_status}</span>
                            </div>
                            <div className='mb-3 bg-slate-50 rounded-xl p-3'>
                                {(order.cartItems || []).map((item, i) => (
                                    <div key={i} className='flex justify-between items-center py-1 border-b border-slate-100 last:border-0'>
                                        <p className='text-xs font-bold text-slate-700'>{item.productId?.name || item.name}</p>
                                        <div className='flex items-center gap-2'>
                                            <span className='text-[10px] text-slate-400'>×{item.quantity}</span>
                                            <span className='text-xs font-bold text-slate-600'>₹{(item.price || 0) * (item.quantity || 1)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── EARNINGS TAB ── */}
            {activeTab === 'earnings' && (
                <div className='flex flex-col gap-4'>
                    <div className='flex gap-2 flex-wrap'>
                        {[{ key: 'today', label: 'Today' }, { key: 'week', label: 'This Week' }, { key: 'month', label: 'This Month' }, { key: 'all', label: 'All Time' }].map(f => (
                            <button key={f.key} onClick={() => setEarningFilter(f.key)}
                                className={`px-4 py-2 rounded-full text-xs font-black transition-all border ${earningFilter === f.key ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                    {filteredEarnings.length === 0 ? (
                        <div className='bg-white rounded-3xl p-10 text-center border-2 border-dashed border-green-200'>
                            <p className='text-4xl mb-3'>💸</p>
                            <p className='font-black text-slate-700'>No delivered orders yet</p>
                            <p className='text-sm text-slate-400 mt-1'>Earnings appear once orders are marked as Delivered.</p>
                        </div>
                    ) : (
                        <>
                            <div className='bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg'>
                                <p className='text-xs font-black uppercase tracking-widest text-green-200 mb-1'>Your Store Earnings</p>
                                <p className='text-4xl font-black'>₹{totalSellerEarning.toLocaleString()}</p>
                                <div className='flex gap-4 mt-3 border-t border-green-500 pt-3 flex-wrap'>
                                    <div><p className='text-[10px] text-green-200 uppercase font-bold'>Gross</p><p className='text-sm font-bold'>₹{totalGross.toLocaleString()}</p></div>
                                    {totalSnapitEarning > 0 && <div><p className='text-[10px] text-yellow-200 uppercase font-bold'>Snapit Cut</p><p className='text-sm font-bold text-yellow-300'>-₹{totalSnapitEarning.toLocaleString()}</p></div>}
                                    <div><p className='text-[10px] text-green-200 uppercase font-bold'>Delivery</p><p className='text-sm font-bold text-red-300'>-₹{totalDelivery.toLocaleString()}</p></div>
                                    <div><p className='text-[10px] text-green-200 uppercase font-bold'>Orders</p><p className='text-sm font-bold'>{totalOrders}</p></div>
                                    <div><p className='text-[10px] text-green-200 uppercase font-bold'>Avg/Order</p><p className='text-sm font-bold'>₹{avgNet}</p></div>
                                </div>
                            </div>
                            {productList.length > 0 && (
                                <div className='bg-white rounded-2xl p-4 shadow-sm border border-slate-100'>
                                    <h3 className='font-black text-slate-800 text-sm uppercase tracking-wider mb-3'>📦 Product Breakdown</h3>
                                    {productList.map(([name, data]) => {
                                        const pct = totalSellerEarning > 0 ? Math.round((data.revenue / totalSellerEarning) * 100) : 0;
                                        return (
                                            <div key={name} className='flex items-center gap-3 mb-2'>
                                                <div className='flex-1'>
                                                    <div className='flex justify-between items-center mb-1'>
                                                        <p className='text-xs font-bold text-slate-700 truncate max-w-[160px]'>{name}</p>
                                                        <div className='flex items-center gap-2'>
                                                            <span className='text-[10px] text-slate-400'>×{data.qty} sold</span>
                                                            <span className='text-xs font-black text-emerald-600'>₹{data.revenue.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                    <div className='w-full bg-slate-100 rounded-full h-1.5'>
                                                        <div className='bg-green-500 h-1.5 rounded-full' style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                                <span className='text-[10px] font-bold text-slate-400 w-8 text-right'>{pct}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default SellerDashboard;