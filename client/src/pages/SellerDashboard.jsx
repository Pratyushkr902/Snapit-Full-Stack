import React, { useEffect, useState } from 'react';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';

const SellerDashboard = () => {
    const [orders, setOrders] = useState([]);

    const fetchNewOrders = async () => {
        const response = await Axios({ ...SummaryApi.getOrderItems });
        if (response.data.success) {
            // Seller only sees orders that are NOT yet ready
            setOrders(response.data.data.filter(o => o.seller_status !== "Ready for Pickup"));
        }
    };

    const markAsReady = async (orderId) => {
        const response = await Axios({
            url: '/api/order/update-seller-status',
            method: 'post',
            data: { orderId, sellerStatus: "Ready for Pickup" }
        });
        if (response.data.success) {
            toast.success("Rider Notified! Order ready for pickup.");
            fetchNewOrders();
        }
    };

    useEffect(() => { fetchNewOrders(); }, []);

    return (
        <div className='p-6 bg-orange-50 min-h-screen'>
            <h1 className='text-2xl font-black mb-6'>STORE PACKING LIST</h1>
            <div className='grid gap-4'>
                {orders.map(order => (
                    <div key={order._id} className='bg-white p-6 rounded-3xl shadow-sm border-2 border-orange-100'>
                        <div className='flex justify-between items-center mb-4'>
                            <span className='font-bold text-orange-600'>{order.orderId}</span>
                            <span className='bg-orange-100 px-3 py-1 rounded-full text-xs font-bold'>{order.seller_status}</span>
                        </div>
                        <div className='mb-4'>
                            {order.cartItems.map((item, i) => (
                                <p key={i} className='font-bold text-slate-700'>• {item.name} (x{item.quantity})</p>
                            ))}
                        </div>
                        <button 
                            onClick={() => markAsReady(order.orderId)}
                            className='w-full bg-orange-500 text-white py-3 rounded-2xl font-black hover:bg-orange-600 transition-all'
                        >
                            PACKED & READY FOR RIDER
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SellerDashboard;