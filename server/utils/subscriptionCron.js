import cron from 'node-cron';
import SubscriptionModel from '../models/subscription.model.js';
import OrderModel from '../models/order.model.js';

cron.schedule('0 6 * * *', async () => {
    console.log('[CRON] Running subscription order trigger...');
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

        const dueSubs = await SubscriptionModel.find({
            status: 'Active',
            nextDeliveryDate: { $gte: todayStart, $lt: todayEnd }
        }).populate('items.productId');

        console.log(`[CRON] Found ${dueSubs.length} subscriptions due today`);

        for (const sub of dueSubs) {
            try {
                await OrderModel.create({
                    userId:           sub.userId,
                    delivery_address: sub.delivery_address,
                    products:         sub.items.map(i => ({
                        productId: i.productId._id,
                        quantity:  i.quantity,
                        price:     i.productId.price
                    })),
                    payment_type:     sub.payment_method,
                    totalAmt:         sub.items.reduce((sum, i) => sum + (i.productId.price * i.quantity), 0),
                    order_status:     'Pending',
                    isSubscriptionOrder: true
                });

                const next = new Date(sub.nextDeliveryDate);
                if (sub.frequency === 'DAILY')            next.setDate(next.getDate() + 1);
                else if (sub.frequency === 'WEEKLY')      next.setDate(next.getDate() + 7);
                else if (sub.frequency === 'ALTERNATIVE') next.setDate(next.getDate() + 2);
                sub.nextDeliveryDate = next;
                await sub.save();

                console.log(`[CRON] Order created for subscription ${sub._id}`);
            } catch (orderErr) {
                console.error(`[CRON] Failed for sub ${sub._id}:`, orderErr.message);
            }
        }
    } catch (err) {
        console.error('[CRON] Fatal error:', err.message);
    }
});

console.log('[CRON] Subscription scheduler registered');
