import React, { useState } from 'react';
import { FaCalendarAlt, FaTruck, FaPause, FaPlay } from 'react-icons/fa';
import Axios from '../utils/Axios';
import toast from 'react-hot-toast';

const SubscriptionCard = ({ subscription, onUpdate }) => {
    const [isActive, setIsActive] = useState(subscription.status === 'Active'); // ✅ Capital A
    const [isLoading, setIsLoading] = useState(false);

    // ✅ Use correct item from items array
    const item = subscription.items?.[0];
    const product = item?.productId;
    const quantity = item?.quantity;

    // ✅ Calculate price from product price × quantity
    const totalPrice = product?.price && quantity ? product.price * quantity : 0;

    const handleStatusToggle = async () => {
        setIsLoading(true);
        const nextStatus = isActive ? 'Paused' : 'Active'; // ✅ Capital casing

        try {
            const endpoint = isActive
                ? `/api/subscription/pause/${subscription._id}`   // ✅ correct route
                : `/api/subscription/resume/${subscription._id}`; // ✅ correct route

            const response = await Axios({ method: 'PATCH', url: endpoint }); // ✅ PATCH not PUT

            if (response.data.success) {
                setIsActive(!isActive);
                toast.success(`Subscription ${nextStatus} successfully!`);
                if (onUpdate) onUpdate();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update subscription status");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white border rounded-xl p-5 shadow-sm my-3 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <img
                    src={product?.image?.[0]}           // ✅ optional chaining
                    alt={product?.name}
                    className="w-16 h-16 object-cover rounded-lg bg-gray-50"
                />
                <div>
                    <h3 className="font-semibold text-gray-800 text-lg">{product?.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                        <FaCalendarAlt className="text-gray-400" /> Frequency:{' '}
                        <span className="font-medium text-gray-700 capitalize">
                            {subscription.frequency?.toLowerCase()}
                        </span>
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                        <FaTruck className="text-gray-400" /> Next Delivery:{' '}
                        <span className="font-medium text-gray-700">
                            {new Date(subscription.nextDeliveryDate).toLocaleDateString()}
                        </span>
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between w-full md:w-auto md:gap-8 border-t md:border-t-0 pt-3 md:pt-0">
                <div className="text-left md:text-center">
                    <span className="text-xs text-gray-400 block uppercase font-bold tracking-wider">Qty</span>
                    <span className="text-gray-800 font-semibold">{quantity} units</span>  {/* ✅ */}
                </div>
                <div className="text-right md:text-center">
                    <span className="text-xs text-gray-400 block uppercase font-bold tracking-wider">Total</span>
                    <span className="text-green-700 font-bold">₹{totalPrice}</span>  {/* ✅ */}
                </div>
            </div>

            <div className="w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0">
                <button
                    disabled={isLoading}
                    onClick={handleStatusToggle}
                    className={`w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                        isActive
                            ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                            : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                    }`}
                >
                    {isLoading ? 'Updating...' : isActive ? (
                        <><FaPause className="text-xs" /> Pause Delivery</>
                    ) : (
                        <><FaPlay className="text-xs" /> Resume Delivery</>
                    )}
                </button>
            </div>
        </div>
    );
};

export default SubscriptionCard;