import React, { useEffect, useState } from 'react';
import Axios from '../utils/Axios';
import SubscriptionCard from '../components/SubscriptionCard';

export default function MySubscriptions() {
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSubscriptions = async () => {
        setLoading(true);
        try {
            const res = await Axios({ method: 'GET', url: '/api/subscription/my-subscriptions' });
            if (res.data.success) setSubscriptions(res.data.data);
        } catch (err) {
            console.error("Failed to load subscriptions", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSubscriptions(); }, []);

    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">My Subscriptions</h1>
            <p className="text-sm text-gray-500 mb-5">Manage your recurring grocery deliveries</p>

            {loading ? (
                <div className="flex justify-center items-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-700" />
                </div>
            ) : subscriptions.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <p className="text-4xl mb-3">📦</p>
                    <p className="font-semibold text-gray-500">No subscriptions yet</p>
                    <p className="text-sm mt-1">Set up recurring orders from any product page</p>
                </div>
            ) : (
                subscriptions.map(sub => (
                    <SubscriptionCard
                        key={sub._id}
                        subscription={sub}
                        onUpdate={fetchSubscriptions}
                    />
                ))
            )}
        </div>
    );
}