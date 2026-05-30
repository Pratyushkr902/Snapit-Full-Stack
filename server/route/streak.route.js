// route/streak.route.js
import express from 'express';
import auth from '../middleware/auth.js';
import UserModel from '../models/user.model.js';

const streakRouter = express.Router();

const STREAK_MILESTONES = {
    3:  20,
    7:  50,
    14: 120,
    30: 300,
};

// GET /api/streak/me
streakRouter.get('/me', auth, async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId).select(
            'currentStreak lastOrderDate claimedMilestones walletBalance'
        );
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const now     = new Date();
        const today   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastOrder = user.lastOrderDate
            ? new Date(user.lastOrderDate.getFullYear(), user.lastOrderDate.getMonth(), user.lastOrderDate.getDate())
            : null;

        const orderedToday = lastOrder && lastOrder.getTime() === today.getTime();

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const streakAlive =
            orderedToday ||
            (lastOrder && lastOrder.getTime() === yesterday.getTime());

        const milestoneKeys      = Object.keys(STREAK_MILESTONES).map(Number).sort((a, b) => a - b);
        const nextMilestone      = milestoneKeys.find(m => m > user.currentStreak) || null;
        const nextMilestoneCoins = nextMilestone ? STREAK_MILESTONES[nextMilestone] : null;

        return res.json({
            success: true,
            data: {
                currentStreak:     streakAlive ? user.currentStreak : 0,
                lastOrderDate:     user.lastOrderDate,
                orderedToday,
                streakAlive,
                claimedMilestones: user.claimedMilestones,
                nextMilestone,
                nextMilestoneCoins,
                milestones:        STREAK_MILESTONES,
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/streak/claim
streakRouter.post('/claim', auth, async (req, res) => {
    try {
        const { milestone } = req.body;
        const milestoneNum  = Number(milestone);

        if (!STREAK_MILESTONES[milestoneNum]) {
            return res.status(400).json({ success: false, message: 'Invalid milestone' });
        }

        const user = await UserModel.findById(req.userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.claimedMilestones.includes(milestoneNum)) {
            return res.status(400).json({ success: false, message: 'Reward already claimed' });
        }

        if (user.currentStreak < milestoneNum) {
            return res.status(400).json({ success: false, message: 'Streak not reached yet' });
        }

        const coins = STREAK_MILESTONES[milestoneNum];

        user.walletBalance = (user.walletBalance || 0) + coins;
        user.walletTransactions.push({
            type:        'CREDIT',
            amount:      coins,
            description: `🔥 ${milestoneNum}-Day Streak Reward`,
            date:        new Date()
        });
        user.claimedMilestones.push(milestoneNum);
        await user.save();

        return res.json({
            success: true,
            message: `${coins} coins added to your Snapit Wallet!`,
            newBalance: user.walletBalance
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

export default streakRouter;