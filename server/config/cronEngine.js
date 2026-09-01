import cron from 'node-cron';
import SubscriptionModel from '../models/subscription.model.js';
import OrderModel from '../models/order.model.js';
import WalletModel from '../models/wallet.model.js';
import ProductModel from '../models/product.model.js';
import UserModel from '../models/user.model.js';
import mongoose from 'mongoose';

// Default fallback parameters matching your Paliganj operations setup
const DEFAULT_STORE = {
    name: "Pali Mega Mart",
    address: "Paliganj, Bihar",
    location: { lat: 25.330951, lng: 84.800609 }
};

export const initSubscriptionCron = () => {
    const isRailway = Boolean(
        process.env.RAILWAY_ENVIRONMENT ||
        process.env.RAILWAY_PROJECT_ID ||
        process.env.RAILWAY_SERVICE_ID ||
        process.env.RAILWAY_STATIC_URL ||
        process.env.ENABLE_CRON === 'true'
    )
    const isBlocked = process.env.RENDER === 'true' || 
                      process.env.IS_FALLBACK_SERVER === 'true' || 
                      process.env.DISABLE_CRON === 'true' ||
                      process.env.RENDER_SERVICE_ID ||
                      process.env.RENDER_EXTERNAL_URL

    if (!isRailway || isBlocked) {
        console.log("🛑 [Subscription Cron] Non-Railway/Standby instance detected. Skipping background cron.");
        return;
    }
    // ⏰ Wakes up automatically every single day at 04:00 AM IST
    // Cron syntax mapping: (Minute Hour Day-of-Month Month Day-of-Week)
    cron.schedule('0 4 * * *', async () => {
        console.log("🚀 [Cron Engine] Booting daily automated subscription processor...");
        
        try {
            const todayStart = new Date();
            todayStart.setHours(23, 59, 59, 999); // Safe upper ceiling window parameter lookup

            // 1. Fetch all active subscriptions scheduled for delivery today or overdue
            const activeSubscriptions = await SubscriptionModel.find({
                nextDeliveryDate: { $lte: todayStart },
                status: 'Active'
            }).populate('items.productId');

            if (activeSubscriptions.length === 0) {
                console.log("ℹ️ [Cron Engine] No recurring subscriptions scheduled for execution today.");
                return;
            }

            console.log(`📋 [Cron Engine] Found ${activeSubscriptions.length} subscriptions to process.`);

            for (const sub of activeSubscriptions) {
                try {
                    let subTotalAmt = 0;
                    const cartItemsPayload = [];
                    let stockCheckPassed = true;

                    // 2. Validate product pricing matrix and verify stocks
                    for (const item of sub.items) {
                        const product = await ProductModel.findById(item.productId._id);
                        if (!product || product.stock < item.quantity) {
                            console.warn(`⚠️ [Cron Engine] Stock allocation failed for product: ${item.productId.name}. Skipping subscription execution.`);
                            stockCheckPassed = false;
                            break;
                        }
                        
                        const itemFinalPrice = product.price; // Dynamic fetch from standard model inventories
                        subTotalAmt += itemFinalPrice * item.quantity;

                        cartItemsPayload.push({
                            productId: product._id,
                            name: product.name,
                            image: product.image[0],
                            quantity: item.quantity,
                            price: itemFinalPrice,
                            seller_store_name: DEFAULT_STORE.name
                        });
                    }

                    if (!stockCheckPassed) continue; // Pass on to next subscriber item entry block

                    // 3. Apply standard baseline delivery fees or handle free caps
                    const deliveryFee = subTotalAmt >= 399 ? 0 : 12;
                    const totalAmt = subTotalAmt + deliveryFee;

                    // 4. Fund check handling: Process Wallet Deductions if configured
                    if (sub.payment_method === 'WALLET') {
                        const wallet = await WalletModel.findOne({ userId: sub.userId });
                        if (!wallet || wallet.balance < totalAmt) {
                            console.warn(`❌ [Cron Engine] Insufficient wallet balance for User: ${sub.userId}. Skipping delivery execution.`);
                            // Optional: Send push notification via fcmToken here alerting user to recharge
                            continue;
                        }

                        // Deduct funds atomically and append debit ledger log records
                        await WalletModel.findOneAndUpdate(
                            { userId: sub.userId },
                            {
                                $inc: { balance: -totalAmt },
                                $push: {
                                    transactions: {
                                        amount: totalAmt,
                                        type: 'debit',
                                        description: `Auto-Order Subscription Charge`,
                                        date: new Date()
                                    }
                                }
                            }
                        );
                    }

                    // 5. Deduct inventory quantities from warehouse models
                    for (const item of sub.items) {
                        await ProductModel.findByIdAndUpdate(item.productId._id, {
                            $inc: { stock: -item.quantity }
                        });
                    }

                    // 6. Generate the standard active shipping receipt inside OrderModel
                    const orderTrackingId = `SUB-ORD-${new mongoose.Types.ObjectId()}`;
                    const assignedRider = await UserModel.findOne({ role: 'RIDER', status: 'Active' });
                    const deliveryOrder = new OrderModel({
                        userId: sub.userId,
                        orderId: orderTrackingId,
                        cartItems: cartItemsPayload,
                        product_details: {
                            name: cartItemsPayload[0].name + (cartItemsPayload.length > 1 ? ` (+${cartItemsPayload.length - 1} more essentials)` : ""),
                            image: [cartItemsPayload[0].image]
                        },
                        paymentId: sub.payment_method === 'WALLET' ? orderTrackingId : "",
                        payment_status: sub.payment_method === 'WALLET' ? "PAID" : "CASH ON DELIVERY",
                        delivery_address: sub.delivery_address,
                        subTotalAmt,
                        totalAmt,
                        delivery_status: "Pending",
                        seller_status: "Pending",
                        store_details: DEFAULT_STORE,
                        involved_stores: [DEFAULT_STORE.name],
                        riderId:       assignedRider?._id   || null,
                        rider_name:    assignedRider?.name   || "Unassigned",
                        rider_contact: assignedRider?.mobile || "",
                        payment_collected: sub.payment_method === 'WALLET'
                    });

                    await deliveryOrder.save();

                    // 7. Recalculate and update the subscriber's next target execution timeline date
                    const nextSchedule = new Date(sub.nextDeliveryDate);
                    if (sub.frequency === 'DAILY') {
                        nextSchedule.setDate(nextSchedule.getDate() + 1);
                    } else if (sub.frequency === 'ALTERNATIVE') {
                        nextSchedule.setDate(nextSchedule.getDate() + 2);
                    } else if (sub.frequency === 'WEEKLY') {
                        nextSchedule.setDate(nextSchedule.getDate() + 7);
                    }

                    sub.nextDeliveryDate = nextSchedule;
                    await sub.save();

                    console.log(`✅ [Cron Engine] Order generated successfully for User: ${sub.userId} -> Order ID: ${orderTrackingId}`);

                } catch (subError) {
                    console.error(`❌ [Cron Engine] Critical error handling individual sub processing loop:`, subError.message);
                }
            }

        } catch (error) {
            console.error("❌ [Cron Engine] Global core lookup loop error crash event logged:", error.message);
        }
    });
};