import cron from 'node-cron';
import SubscriptionModel from '../models/subscription.model.js';
import OrderModel from '../models/order.model.js';

cron.schedule('0 6 * * *', async () => {
    console.log('[CRON] Running subscription order trigger...');
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

        // Filter out Snapit Plus VIP memberships and only process physical grocery subscriptions
        const dueSubs = await SubscriptionModel.find({
            status: 'Active',
            isSnapitPlus: { $ne: true },
            nextDeliveryDate: { $gte: todayStart, $lt: todayEnd }
        }).populate('items.productId');

        console.log(`[CRON] Found ${dueSubs.length} grocery subscriptions due today`);

        for (const sub of dueSubs) {
            try {
                // Ensure products exist and are valid
                const validItems = (sub.items || []).filter(i => i.productId && i.productId._id);
                if (!validItems.length) {
                    console.warn(`[CRON] No valid items found for sub ${sub._id}. Skipping order creation.`);
                    continue;
                }

                const totalAmt = validItems.reduce((sum, i) => {
                    const price = Number(i.productId.price) || Number(i.price) || 0;
                    return sum + (price * (Number(i.quantity) || 1));
                }, 0);

                await OrderModel.create({
                    userId:           sub.userId,
                    delivery_address: sub.delivery_address,
                    products:         validItems.map(i => ({
                        productId: i.productId._id,
                        quantity:  Number(i.quantity) || 1,
                        price:     Number(i.productId.price) || Number(i.price) || 0
                    })),
                    payment_type:     sub.payment_method || 'COD',
                    totalAmt,
                    order_status:     'Pending',
                    isSubscriptionOrder: true
                });

                // Compute next scheduled delivery date
                const next = new Date(sub.nextDeliveryDate || now);
                if (sub.frequency === 'DAILY')            next.setDate(next.getDate() + 1);
                else if (sub.frequency === 'WEEKLY')      next.setDate(next.getDate() + 7);
                else if (sub.frequency === 'ALTERNATIVE') next.setDate(next.getDate() + 2);
                else next.setDate(next.getDate() + 1);

                // If next date is still in the past, bump to tomorrow
                if (next < now) {
                    next.setDate(now.getDate() + 1);
                }

                sub.nextDeliveryDate = next;
                await sub.save();

                console.log(`[CRON] Order created for subscription ${sub._id}. Next: ${next.toISOString()}`);
            } catch (orderErr) {
                console.error(`[CRON] Failed for sub ${sub._id}:`, orderErr.message);
            }
        }
    } catch (err) {
        console.error('[CRON] Fatal subscription cron error:', err.message);
    }
});

console.log('[CRON] Subscription scheduler registered');
