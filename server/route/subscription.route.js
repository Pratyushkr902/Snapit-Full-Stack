import express from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth.js';
import SubscriptionModel from '../models/subscription.model.js';
import UserModel from '../models/user.model.js';

const subscriptionRouter = express.Router();

// Helper to construct query that reliably matches user ID whether stored as ObjectId or String
const getUserMatchQuery = (userId) => {
    const conditions = [{ userId: String(userId) }];
    if (mongoose.Types.ObjectId.isValid(userId)) {
        conditions.push({ userId: new mongoose.Types.ObjectId(userId) });
    }
    return { $or: conditions };
};

const extractSubId = (req) => {
    return req.params.id || req.body?.id || req.body?.subscriptionId || req.query?.id || null;
};

// ── GET /my-subscriptions ──────────────────────────────────────────────────
// Returns all user recurring subscriptions + automatically syncs Snapit Plus VIP membership
subscriptionRouter.get('/my-subscriptions', auth, async (req, res) => {
    try {
        const userMatch = getUserMatchQuery(req.userId);

        // Fetch subscriptions (Active, Paused, and optionally Cancelled if requested)
        const showAll = req.query.all === 'true';
        const statusFilter = showAll ? {} : { status: { $in: ['Active', 'Paused'] } };

        const subs = await SubscriptionModel.find({
            ...userMatch,
            ...statusFilter
        })
            .populate('items.productId', 'name image price unit discount')
            .populate('delivery_address')
            .sort({ createdAt: -1 });

        // Check if user has an active Snapit Plus membership in UserModel
        try {
            const user = await UserModel.findById(req.userId).select('isSnapitPlusMember snapitPlusExpiresAt name email');
            const isPlusActive = Boolean(
                user?.isSnapitPlusMember &&
                (!user.snapitPlusExpiresAt || new Date(user.snapitPlusExpiresAt) > new Date())
            );

            if (isPlusActive) {
                // Ensure a Snapit Plus subscription card is present in the list
                const hasPlusInSubs = subs.some(s => s.isSnapitPlus && s.status === 'Active');

                if (!hasPlusInSubs) {
                    // Check if an existing Plus record is in DB or create a fresh one
                    let existingPlus = await SubscriptionModel.findOne({
                        ...userMatch,
                        isSnapitPlus: true
                    });

                    const expiryDate = user.snapitPlusExpiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                    if (existingPlus) {
                        existingPlus.status = 'Active';
                        existingPlus.expiresAt = expiryDate;
                        await existingPlus.save();
                        subs.unshift(existingPlus);
                    } else {
                        const createdPlus = await SubscriptionModel.create({
                            userId: new mongoose.Types.ObjectId(req.userId),
                            items: [{
                                name: 'Snapit Plus VIP Membership',
                                quantity: 1,
                                price: 99
                            }],
                            frequency: 'monthly',
                            payment_method: 'Online',
                            status: 'Active',
                            isSnapitPlus: true,
                            planType: 'monthly',
                            expiresAt: expiryDate
                        });
                        subs.unshift(createdPlus);
                    }
                }
            }
        } catch (syncErr) {
            console.warn('[my-subscriptions] Non-fatal Plus membership sync warning:', syncErr.message);
        }

        return res.json({ success: true, data: subs });
    } catch (err) {
        console.error('[my-subscriptions] Error:', err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ── POST /create ────────────────────────────────────────────────────────────
// Create a recurring daily/weekly grocery delivery
subscriptionRouter.post('/create', auth, async (req, res) => {
    try {
        const { items, frequency, delivery_address, nextDeliveryDate, payment_method } = req.body;

        if (!items?.length)    return res.status(400).json({ success: false, message: 'At least one item is required' });
        if (!frequency)        return res.status(400).json({ success: false, message: 'Frequency is required' });
        if (!delivery_address) return res.status(400).json({ success: false, message: 'Delivery address is required' });

        if (!mongoose.Types.ObjectId.isValid(delivery_address)) {
            return res.status(400).json({ success: false, message: 'Invalid delivery address ID' });
        }

        const sub = await SubscriptionModel.create({
            userId: new mongoose.Types.ObjectId(req.userId),
            items,
            frequency: String(frequency).toUpperCase(),
            delivery_address,
            nextDeliveryDate: nextDeliveryDate || new Date(),
            payment_method: payment_method || 'COD',
            status: 'Active'
        });

        return res.json({ success: true, message: 'Recurring delivery scheduled!', data: sub });
    } catch (err) {
        console.error('[SUB CREATE] ERROR:', err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ── PAUSE / RESUME HANDLERS ─────────────────────────────────────────────────
const handleStatusChange = async (req, res, targetStatus) => {
    try {
        const id = extractSubId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid subscription ID' });
        }

        const userMatch = getUserMatchQuery(req.userId);
        const sub = await SubscriptionModel.findOne({ _id: id, ...userMatch });

        if (!sub) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        sub.status = targetStatus;
        await sub.save();

        return res.json({
            success: true,
            message: `Subscription ${targetStatus.toLowerCase()} successfully`,
            data: sub
        });
    } catch (err) {
        console.error(`[SUB ${targetStatus}] ERROR:`, err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
};

subscriptionRouter.patch('/pause/:id', auth, (req, res) => handleStatusChange(req, res, 'Paused'));
subscriptionRouter.post('/pause/:id',  auth, (req, res) => handleStatusChange(req, res, 'Paused'));
subscriptionRouter.patch('/pause',     auth, (req, res) => handleStatusChange(req, res, 'Paused'));
subscriptionRouter.post('/pause',      auth, (req, res) => handleStatusChange(req, res, 'Paused'));

subscriptionRouter.patch('/resume/:id', auth, (req, res) => handleStatusChange(req, res, 'Active'));
subscriptionRouter.post('/resume/:id',  auth, (req, res) => handleStatusChange(req, res, 'Active'));
subscriptionRouter.patch('/resume',     auth, (req, res) => handleStatusChange(req, res, 'Active'));
subscriptionRouter.post('/resume',      auth, (req, res) => handleStatusChange(req, res, 'Active'));

// ── CANCEL HANDLERS (Multi-method & fallback tolerant) ───────────────────────
const handleCancel = async (req, res) => {
    try {
        const id = extractSubId(req);

        // Special handling for synthesized Snapit Plus subscription card
        if (id === 'snapit_plus_synced' || req.body?.isSnapitPlus) {
            await UserModel.findByIdAndUpdate(req.userId, {
                isSnapitPlusMember: false,
                snapitPlusExpiresAt: null
            });
            await SubscriptionModel.updateMany(
                { ...getUserMatchQuery(req.userId), isSnapitPlus: true },
                { status: 'Cancelled' }
            );
            return res.json({
                success: true,
                message: 'Snapit Plus VIP membership cancelled successfully'
            });
        }

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid subscription ID' });
        }

        const userMatch = getUserMatchQuery(req.userId);
        const sub = await SubscriptionModel.findOne({ _id: id, ...userMatch });

        if (!sub) {
            return res.status(404).json({ success: false, message: 'Subscription not found or already cancelled' });
        }

        sub.status = 'Cancelled';
        sub.nextDeliveryDate = null;
        await sub.save();

        // If this was a Snapit Plus VIP subscription, synchronize UserModel
        if (sub.isSnapitPlus) {
            await UserModel.findByIdAndUpdate(req.userId, {
                isSnapitPlusMember: false,
                snapitPlusExpiresAt: null
            });
            console.log(`[SUB CANCEL] Snapit Plus cancelled for user ${req.userId}`);
        }

        return res.json({
            success: true,
            message: sub.isSnapitPlus
                ? 'Snapit Plus VIP membership cancelled successfully'
                : 'Recurring delivery cancelled successfully',
            data: sub
        });
    } catch (err) {
        console.error('[SUB CANCEL] ERROR:', err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
};

subscriptionRouter.delete('/cancel/:id', auth, handleCancel);
subscriptionRouter.delete('/cancel',     auth, handleCancel);
subscriptionRouter.post('/cancel/:id',   auth, handleCancel);
subscriptionRouter.post('/cancel',       auth, handleCancel);
subscriptionRouter.patch('/cancel/:id',  auth, handleCancel);
subscriptionRouter.patch('/cancel',      auth, handleCancel);

export default subscriptionRouter;