import express from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth.js';
import SubscriptionModel from '../models/subscription.model.js';

const subscriptionRouter = express.Router();

const validateSubId = (id, res) => {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid subscription ID' });
        return false;
    }
    return true;
};

subscriptionRouter.get('/my-subscriptions', auth, async (req, res) => {
    try {
        const subs = await SubscriptionModel.find({
            userId: new mongoose.Types.ObjectId(req.userId),
            status: { $ne: 'Cancelled' }
        })
            .populate('items.productId', 'name image price unit discount')
            .populate('delivery_address')
            .sort({ createdAt: -1 });
        return res.json({ success: true, data: subs });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

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
            frequency,
            delivery_address,
            nextDeliveryDate: nextDeliveryDate || new Date(),
            payment_method: payment_method || 'COD'
        });

        return res.json({ success: true, data: sub });
    } catch (err) {
        console.error('[SUB CREATE] ERROR:', err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
});

subscriptionRouter.patch('/pause/:id', auth, async (req, res) => {
    try {
        if (!validateSubId(req.params.id, res)) return;

        const sub = await SubscriptionModel.findOneAndUpdate(
            { _id: req.params.id, userId: new mongoose.Types.ObjectId(req.userId) },
            { status: 'Paused' },
            { new: true }
        );
        if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });
        return res.json({ success: true, data: sub });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

subscriptionRouter.patch('/resume/:id', auth, async (req, res) => {
    try {
        if (!validateSubId(req.params.id, res)) return;

        const sub = await SubscriptionModel.findOneAndUpdate(
            { _id: req.params.id, userId: new mongoose.Types.ObjectId(req.userId) },
            { status: 'Active' },
            { new: true }
        );
        if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });
        return res.json({ success: true, data: sub });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

subscriptionRouter.delete('/cancel/:id', auth, async (req, res) => {
    try {
        if (!validateSubId(req.params.id, res)) return;

        const sub = await SubscriptionModel.findOneAndUpdate(
            { _id: req.params.id, userId: new mongoose.Types.ObjectId(req.userId) },
            { status: 'Cancelled' },
            { new: true }
        );
        if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });
        return res.json({ success: true, message: 'Subscription cancelled successfully', data: sub });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

export default subscriptionRouter;