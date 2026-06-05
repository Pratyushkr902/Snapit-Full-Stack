// 📁 utils/autoConfirmOrders.js
// Drop this file in your backend utils folder
// Then call startAutoConfirmCron() in your server.js

import cron from 'node-cron';
import OrderModel from '../models/order.model.js';

const AUTO_CONFIRM_MINUTES = 5; // ⏱ Change this to your preferred timeout

export const autoConfirmStuckOrders = async () => {
    try {
        const cutoff = new Date(Date.now() - AUTO_CONFIRM_MINUTES * 60 * 1000);

        // Find all orders that are:
        // 1. Still pending seller confirmation
        // 2. Older than AUTO_CONFIRM_MINUTES
        // 3. Not already cancelled or delivered
        const stuckOrders = await OrderModel.find({
            seller_status: { $in: ['Pending', 'Packing'] },
            delivery_status: { $nin: ['Delivered', 'Cancelled'] },
            createdAt: { $lt: cutoff }
        });

        if (stuckOrders.length === 0) return;

        console.log(`[AutoConfirm] Found ${stuckOrders.length} stuck order(s) — auto-confirming...`);

        for (const order of stuckOrders) {
            await OrderModel.findByIdAndUpdate(order._id, {
                seller_status: 'Ready for Pickup',
                delivery_status: 'Confirmed', // ✅ Rider can now see it
            });

            console.log(`[AutoConfirm] ✅ Order ${order.orderId} auto-confirmed after ${AUTO_CONFIRM_MINUTES} mins`);
        }

    } catch (error) {
        console.error('[AutoConfirm] ❌ Cron error:', error.message);
    }
};

// Call this once in your server.js to start the cron
export const startAutoConfirmCron = () => {
    // Runs every 2 minutes
    cron.schedule('*/2 * * * *', async () => {
        await autoConfirmStuckOrders();
    });

    console.log('[AutoConfirm] ✅ Cron started — checks every 2 mins');
};