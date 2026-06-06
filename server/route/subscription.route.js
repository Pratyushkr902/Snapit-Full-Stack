import express from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth.js';
import SubscriptionModel from '../models/subscription.model.js';

const subscriptionRouter = express.Router();

subscriptionRouter.get('/my-subscriptions', auth, async (req, res) => {
    try {
        const subs = await SubscriptionModel.find({
            userId: new mongoose.Types.ObjectId(req.userId),
            status: { $ne: 'Cancelled' }
        })
            .populate('items.productId', 'name image price')
            .populate('delivery_address')
            .sort({ createdAt: -1 });
        return res.json({ success: true, data: subs });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

subscriptionRouter.post('/create', auth, async (req, res) => {
    try {
        console.log('[SUB CREATE] userId:', req.userId)
        console.log('[SUB CREATE] body:', JSON.stringify(req.body))

        const { items, frequency, delivery_address, nextDeliveryDate, payment_method } = req.body;

        if (!items?.length)    return res.status(400).json({ success: false, message: 'items required' })
        if (!frequency)        return res.status(400).json({ success: false, message: 'frequency required' })
        if (!delivery_address) return res.status(400).json({ success: false, message: 'delivery_address required' })

        const sub = await SubscriptionModel.create({
            userId: new mongoose.Types.ObjectId(req.userId),
            items,
            frequency,
            delivery_address,
            nextDeliveryDate: nextDeliveryDate || new Date(),
            payment_method: payment_method || 'COD'
        });

        console.log('[SUB CREATE] saved:', sub._id)
        return res.json({ success: true, data: sub });
    } catch (err) {
        console.error('[SUB CREATE] ERROR:', err.message)
        return res.status(500).json({ success: false, message: err.message });
    }
});

subscriptionRouter.patch('/pause/:id', auth, async (req, res) => {
    try {
        const sub = await SubscriptionModel.findOneAndUpdate(
            { _id: req.params.id, userId: new mongoose.Types.ObjectId(req.userId) },
            { status: 'Paused' },
            { new: true }
        );
        if (!sub) return res.status(404).json({ success: false, message: 'Not found' });
        return res.json({ success: true, data: sub });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

subscriptionRouter.patch('/resume/:id', auth, async (req, res) => {
    try {
        const sub = await SubscriptionModel.findOneAndUpdate(
            { _id: req.params.id, userId: new mongoose.Types.ObjectId(req.userId) },
            { status: 'Active' },
            { new: true }
        );
        if (!sub) return res.status(404).json({ success: false, message: 'Not found' });
        return res.json({ success: true, data: sub });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

subscriptionRouter.delete('/cancel/:id', auth, async (req, res) => {
    try {
        const sub = await SubscriptionModel.findOneAndUpdate(
            { _id: req.params.id, userId: new mongoose.Types.ObjectId(req.userId) },
            { status: 'Cancelled' },
            { new: true }
        );
        if (!sub) return res.status(404).json({ success: false, message: 'Not found' });
        return res.json({ success: true, message: 'Subscription cancelled' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

export default subscriptionRouter;