import React, { useEffect, useState } from 'react';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import Loading from '../components/Loading';

const StoreOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchOrdersToPack = async () => {
        try {
            // We only show loading on the first hit to avoid flickering during auto-refresh
            if(orders.length === 0) setLoading(true); 
            
            const response = await Axios({ ...SummaryApi.getOrderItems });
            if (response.data.success) {
                // FIXED: Strictly filter out "Delivered", "Cancelled", and "Ready for Pickup" orders
                // This ensures the Store only sees what they NEED to pack right now.
                const toPack = response.data.data.filter(o => 
                    (o.seller_status === "Pending" || o.seller_status === "Packing") && 
                    o.delivery_status !== "Delivered" &&
                    o.delivery_status !== "Cancelled"
                );
                setOrders(toPack);
            }
        } catch (error) {
            console.error("Fetch error", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            const response = await Axios({
                ...SummaryApi.updateSellerStatus,
                data: { orderId, sellerStatus: newStatus }
            });
            if (response.data.success) {
                toast.success(newStatus === "Ready for Pickup" ? "Rider Notified! Order removed from list." : "Packing started...");
                // Refresh list immediately to remove the packed order
                fetchOrdersToPack();
            }
        } catch (error) {
            toast.error("Failed to update store status");
        }
    };

    useEffect(() => {
        fetchOrdersToPack();

        // NEW FEATURE: Auto-refresh every 30 seconds to catch new Paliganj orders
        const interval = setInterval(() => {
            fetchOrdersToPack();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    if (loading) return <Loading />;

    return (
        <div className='p-4 lg:p-6 bg-orange-50 min-h-screen'>
            <div className='mb-6 flex justify-between items-end'>
                <div>
                    <h2 className='font-black text-2xl text-slate-800 uppercase tracking-tight'>Store Packing List</h2>
                    <p className='text-slate-500 text-sm font-bold'>Paliganj Mart</p>
                    <p1 className='text-slate-500 text-sm font-bold'>Grocery Store</p1>
                </div>
                <div className='text-right'>
                    <p className='text-[10px] font-black text-orange-600 uppercase'>Active Tasks</p>
                    <p className='text-2xl font-black text-slate-800'>{orders.length}</p>
                </div>
            </div>

            <div className='grid gap-6 md:grid-cols-2'>
                {orders.length === 0 ? (
                    <div className='col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-orange-200'>
                        <p className='text-slate-400 font-bold'>All orders are packed and with riders! 📦</p>
                        <button onClick={fetchOrdersToPack} className='mt-4 text-xs font-bold text-orange-600 underline'>Check for new orders</button>
                    </div>
                ) : (
                    orders.map(order => (
                        <div key={order._id} className='bg-white p-6 rounded-[2.5rem] shadow-sm border border-orange-100 flex flex-col'>
                            <div className='flex justify-between items-start mb-4'>
                                <div className='flex flex-col'>
                                    <span className='text-[10px] font-black bg-orange-100 text-orange-600 px-3 py-1 rounded-full uppercase w-fit'>
                                        {order.orderId}
                                    </span>
                                    <p className='text-[10px] text-slate-400 font-bold mt-1'>Ordered by: {order.userId?.name || "Customer"}</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${order.seller_status === 'Packing' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                    {order.seller_status}
                                </span>
                            </div>

                            <div className='space-y-3 mb-6'>
                                <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Items to Pack:</p>
                                {order.cartItems?.map((item, i) => (
                                    <div key={i} className='flex justify-between items-center bg-slate-50 p-3 rounded-2xl'>
                                        <div className='flex items-center gap-2'>
                                            <div className='w-2 h-2 rounded-full bg-orange-400'></div>
                                            <span className='text-sm font-bold text-slate-700'>{item.name}</span>
                                        </div>
                                        <span className='bg-white border px-2 py-1 rounded-lg text-xs font-black'>x{item.quantity}</span>
                                    </div>
                                ))}
                            </div>

                            <div className='mt-auto flex gap-2'>
                                {order.seller_status === "Pending" && (
                                    <button 
                                        onClick={() => handleUpdateStatus(order.orderId, "Packing")}
                                        className='flex-1 bg-slate-100 text-slate-700 py-4 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all'
                                    >
                                        START PACKING
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleUpdateStatus(order.orderId, "Ready for Pickup")}
                                    className='flex-[2] bg-orange-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all uppercase'
                                >
                                    Ready for Rider
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default StoreOrders;