import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import Loading from '../components/Loading';

const getOrderAmount     = (o) => Number(o.totalAmt ?? o.total_amount ?? o.amount ?? o.subTotalAmt ?? 0);
const getDeliveryFee     = (o) => Number(o.delivery_fee ?? o.deliveryFee ?? o.delivery_charge ?? 0);
const getItemSellerPrice = (item) => Number(item.sellerPrice ?? item.seller_price ?? item.price ?? item.unit_price ?? 0);
const getSellerEarning   = (order) =>
    (order.cartItems || []).reduce(
        (acc, item) => acc + getItemSellerPrice(item) * (Number(item.quantity) || 1), 0
    );

const fmtINR = (n) =>
    `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const StoreOrders = () => {
    const [allOrders, setAllOrders] = useState([]);
    const [tabFilter, setTabFilter] = useState('to_pack');
    const [loading, setLoading]     = useState(false);
    const [updating, setUpdating]   = useState({});
    const navigate                  = useNavigate();

    const fetchOrdersToPack = async () => {
        try {
            if (allOrders.length === 0) setLoading(true);
            const response = await Axios({ ...SummaryApi.getSellerOrders });
            if (response.data.success) {
                setAllOrders(Array.isArray(response.data.data) ? response.data.data : []);
            }
        } catch (error) {
            console.error("Fetch error", error);
            toast.error("Could not load orders. Please refresh.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (orderId, newStatus) => {
        setUpdating(prev => ({ ...prev, [orderId]: newStatus }));
        try {
            const response = await Axios({
                ...SummaryApi.updateSellerStatus,
                data: { orderId, sellerStatus: newStatus }
            });
            if (response.data.success) {
                toast.success(
                    newStatus === "Ready for Pickup"
                        ? "✅ Rider Notified! Order ready for pickup."
                        : "📦 Packing started..."
                );
                fetchOrdersToPack();
            }
        } catch {
            toast.error("Failed to update store status");
        } finally {
            setUpdating(prev => { const n = { ...prev }; delete n[orderId]; return n; });
        }
    };

    useEffect(() => {
        fetchOrdersToPack();
        const interval = setInterval(fetchOrdersToPack, 30000);
        return () => clearInterval(interval);
    }, []);

    const toPackOrders = allOrders.filter(o =>
        o.seller_status !== 'Ready for Pickup' &&
        o.delivery_status !== 'Out for Delivery' &&
        o.delivery_status !== 'Delivered' &&
        o.delivery_status !== 'Cancelled'
    );
    const readyOrders = allOrders.filter(o =>
        o.seller_status === 'Ready for Pickup' &&
        o.delivery_status !== 'Delivered' &&
        o.delivery_status !== 'Cancelled'
    );

    const orders = tabFilter === 'to_pack'
        ? toPackOrders
        : tabFilter === 'ready'
            ? readyOrders
            : allOrders;

    if (loading) return <Loading />;

    const totalEarningInQueue = toPackOrders.reduce((a, o) => a + getSellerEarning(o), 0);
    const packingCount        = toPackOrders.filter(o => o.seller_status === 'Packing').length;
    const pendingCount        = toPackOrders.filter(o => o.seller_status !== 'Packing').length;

    return (
        <div className='min-h-screen bg-orange-50'>

            {/* Header with Back Button */}
            <div className='sticky top-0 z-20 bg-white border-b border-orange-100 shadow-sm px-4 py-4'>
                <div className='max-w-4xl mx-auto flex justify-between items-center gap-3'>
                    <div className='flex items-center gap-3'>
                        <button
                            onClick={() => navigate(-1)}
                            className='text-neutral-500 hover:text-neutral-800 transition-colors'
                        >
                            <IoArrowBack size={22} />
                        </button>
                        <div>
                            <h2 className='font-black text-xl text-slate-800 uppercase tracking-tight'>Store Packing</h2>
                            <p className='text-slate-400 text-xs font-bold uppercase tracking-widest'>Snapit — Paliganj</p>
                        </div>
                    </div>
                    <div className='flex gap-2 items-center'>
                        <button
                            onClick={fetchOrdersToPack}
                            className='bg-orange-50 border border-orange-200 text-orange-500 rounded-xl px-3 py-2 text-sm font-black hover:bg-orange-100 transition-all'>
                            🔄
                        </button>
                        <div className='bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-center'>
                            <p className='text-[9px] font-black text-slate-400 uppercase'>Pending</p>
                            <p className='text-lg font-black text-orange-500 leading-none'>{pendingCount}</p>
                        </div>
                        <div className='bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-center'>
                            <p className='text-[9px] font-black text-slate-400 uppercase'>Packing</p>
                            <p className='text-lg font-black text-blue-600 leading-none'>{packingCount}</p>
                        </div>
                        <div className='bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-center'>
                            <p className='text-[9px] font-black text-slate-400 uppercase'>Queue ₹</p>
                            <p className='text-sm font-black text-emerald-600 leading-none'>{fmtINR(totalEarningInQueue)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className='max-w-4xl mx-auto p-4 lg:p-6'>
                {/* Segmented Filter Tabs */}
                <div className='flex gap-2 mb-4 overflow-x-auto pb-1'>
                    <button
                        onClick={() => setTabFilter('to_pack')}
                        className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
                            tabFilter === 'to_pack'
                                ? 'bg-orange-500 text-white shadow-md'
                                : 'bg-white text-slate-600 border border-orange-200 hover:bg-orange-50'
                        }`}
                    >
                        ⏳ To Pack ({toPackOrders.length})
                    </button>
                    <button
                        onClick={() => setTabFilter('ready')}
                        className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
                            tabFilter === 'ready'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white text-slate-600 border border-orange-200 hover:bg-blue-50'
                        }`}
                    >
                        📦 Ready for Pickup ({readyOrders.length})
                    </button>
                    <button
                        onClick={() => setTabFilter('all')}
                        className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
                            tabFilter === 'all'
                                ? 'bg-slate-800 text-white shadow-md'
                                : 'bg-white text-slate-600 border border-orange-200 hover:bg-slate-100'
                        }`}
                    >
                        📋 All Orders ({allOrders.length})
                    </button>
                </div>
                {orders.length > 0 && (
                    <div className='mb-4 bg-white rounded-2xl px-4 py-3 border border-orange-100 shadow-sm flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                            <span className='text-xl'>📋</span>
                            <div>
                                <p className='text-sm font-black text-slate-800'>{orders.length} Active Task{orders.length > 1 ? 's' : ''}</p>
                                <p className='text-[10px] text-slate-400 font-bold'>Pack & notify rider when ready</p>
                            </div>
                        </div>
                        <div className='text-right'>
                            <p className='text-[9px] font-black text-slate-400 uppercase'>Your Earnings</p>
                            <p className='text-lg font-black text-emerald-600'>{fmtINR(totalEarningInQueue)}</p>
                        </div>
                    </div>
                )}

                <div className='grid gap-4 md:grid-cols-2'>
                    {orders.length === 0 ? (
                        <div className='col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-orange-200'>
                            <p className='text-5xl mb-4'>🎉</p>
                            <p className='font-black text-slate-700 text-lg'>All orders packed and with riders!</p>
                            <p className='text-sm text-slate-400 mt-1'>No pending orders right now.</p>
                            <button onClick={fetchOrdersToPack}
                                className='mt-5 bg-orange-500 text-white font-black text-sm px-6 py-2.5 rounded-full hover:bg-orange-600 transition-all'>
                                Check for new orders
                            </button>
                        </div>
                    ) : (
                        orders.map(order => {
                            const sellerEarning = getSellerEarning(order);
                            const orderTotal    = getOrderAmount(order);
                            const deliveryFee   = getDeliveryFee(order);
                            const isPacking     = order.seller_status === 'Packing';
                            const isUpdating    = updating[order.orderId];

                            return (
                                <div key={order._id}
                                    className={`bg-white p-5 rounded-3xl shadow-sm border-2 flex flex-col transition-all ${
                                        isPacking ? 'border-blue-200' : 'border-orange-100'
                                    }`}>

                                    <div className='flex justify-between items-start mb-3'>
                                        <div className='flex flex-col gap-1'>
                                            <span className='text-[10px] font-black bg-orange-100 text-orange-600 px-3 py-1 rounded-full uppercase w-fit'>
                                                {order.orderId}
                                            </span>
                                            <p className='text-[10px] text-slate-400 font-bold'>👤 {order.userId?.name || "Customer"}</p>
                                            <p className='text-[10px] text-slate-400 font-bold'>
                                                🕐 {new Date(order.createdAt).toLocaleString('en-IN', {
                                                    day: 'numeric', month: 'short',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl ${
                                            isPacking ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            {isPacking ? '📦 Packing' : '🆕 New'}
                                        </span>
                                    </div>

                                    {order.store_details?.name && (
                                        <div className='flex items-center gap-2 mb-3 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2'>
                                            <span>🏪</span>
                                            <div>
                                                <p className='text-[9px] font-black text-indigo-400 uppercase'>Store</p>
                                                <p className='text-sm font-black text-indigo-700'>{order.store_details.name}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className='mb-4 bg-slate-50 rounded-2xl p-3'>
                                        <p className='text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2'>📦 Items to Pack:</p>
                                        {(order.cartItems || []).map((item, i) => {
                                            const sp    = getItemSellerPrice(item);
                                            const qty   = Number(item.quantity) || 1;
                                            const total = sp * qty;
                                            return (
                                                <div key={i} className='flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0'>
                                                    <div className='flex items-center gap-2'>
                                                        <div className='w-2 h-2 rounded-full bg-orange-400 flex-shrink-0'></div>
                                                        <div>
                                                            <p className='text-sm font-bold text-slate-700 leading-tight'>{item.productId?.name || item.name}</p>
                                                            <p className='text-[9px] text-slate-400'>{fmtINR(sp)} × {qty}</p>
                                                        </div>
                                                    </div>
                                                    <div className='flex items-center gap-2 flex-shrink-0 ml-2'>
                                                        <span className='bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-xs font-black text-slate-600'>×{qty}</span>
                                                        <span className='text-xs font-black text-slate-800'>{fmtINR(total)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className='bg-gradient-to-r from-slate-50 to-orange-50 rounded-2xl p-3 mb-4 border border-orange-100'>
                                        <div className='grid grid-cols-3 gap-2 text-center'>
                                            <div>
                                                <p className='text-[9px] font-black text-slate-400 uppercase'>Order Total</p>
                                                <p className='text-sm font-black text-slate-800'>{fmtINR(orderTotal)}</p>
                                            </div>
                                            <div>
                                                <p className='text-[9px] font-black text-red-400 uppercase'>Delivery</p>
                                                <p className='text-sm font-black text-red-500'>{deliveryFee > 0 ? `-${fmtINR(deliveryFee)}` : '—'}</p>
                                            </div>
                                            <div>
                                                <p className='text-[9px] font-black text-emerald-600 uppercase'>You Earn</p>
                                                <p className='text-sm font-black text-emerald-600'>{fmtINR(sellerEarning)}</p>
                                            </div>
                                        </div>
                                        <div className='mt-2 pt-2 border-t border-orange-100 flex justify-between items-center'>
                                            <p className='text-[9px] font-black text-blue-500 uppercase'>Sales (excl. delivery)</p>
                                            <p className='text-sm font-black text-blue-600'>{fmtINR(orderTotal - deliveryFee)}</p>
                                        </div>
                                    </div>

                                    <div className='flex items-center gap-2 mb-4'>
                                        <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                                            order.payment_status === 'CASH ON DELIVERY'
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-green-100 text-green-700'
                                        }`}>
                                            {order.payment_status === 'CASH ON DELIVERY' ? '💵 Cash on Delivery' : '✅ Paid Online'}
                                        </span>
                                    </div>

                                    <div className='mt-auto flex gap-2'>
                                        {order.seller_status === "Pending" && (
                                            <button onClick={() => handleUpdateStatus(order.orderId, "Packing")}
                                                disabled={!!isUpdating}
                                                className='flex-1 bg-slate-100 text-slate-700 py-3.5 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all disabled:opacity-60 active:scale-95'>
                                                {isUpdating === 'Packing' ? '⏳ Starting...' : '📦 START PACKING'}
                                            </button>
                                        )}
                                        <button onClick={() => handleUpdateStatus(order.orderId, "Ready for Pickup")}
                                            disabled={!!isUpdating}
                                            className='flex-[2] bg-orange-500 text-white py-3.5 rounded-2xl font-black text-sm hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all uppercase disabled:opacity-60 active:scale-95'>
                                            {isUpdating === 'Ready for Pickup' ? '⏳ Notifying...' : '🛵 Ready for Rider'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoreOrders;