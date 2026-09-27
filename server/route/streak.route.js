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

const DAILY_CHECKIN_COINS = 5;

// GET /api/streak/me
streakRouter.get('/me', auth, async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId).select(
            'currentStreak lastOrderDate claimedMilestones walletBalance lastCheckin checkinHistory'
        );
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const now     = new Date();
        const today   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastOrder = user.lastOrderDate
            ? new Date(user.lastOrderDate.getFullYear(), user.lastOrderDate.getMonth(), user.lastOrderDate.getDate())
            : null;

        const orderedToday = Boolean(lastOrder && lastOrder.getTime() === today.getTime());

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const streakAlive =
            orderedToday ||
            Boolean(lastOrder && lastOrder.getTime() === yesterday.getTime());

        // Check if user already claimed daily check-in today
        const lastCheckin = user.lastCheckin ? new Date(user.lastCheckin) : null;
        const checkedInToday = Boolean(
            lastCheckin &&
            lastCheckin.getFullYear() === now.getFullYear() &&
            lastCheckin.getMonth() === now.getMonth() &&
            lastCheckin.getDate() === now.getDate()
        );

        const milestoneKeys      = Object.keys(STREAK_MILESTONES).map(Number).sort((a, b) => a - b);
        const effectiveStreak    = streakAlive ? (user.currentStreak || 0) : 0;
        const nextMilestone      = milestoneKeys.find(m => m > effectiveStreak) || null;
        const nextMilestoneCoins = nextMilestone ? STREAK_MILESTONES[nextMilestone] : null;

        return res.json({
            success: true,
            data: {
                currentStreak:     effectiveStreak,
                lastOrderDate:     user.lastOrderDate,
                orderedToday,
                streakAlive,
                claimedMilestones: user.claimedMilestones || [],
                nextMilestone,
                nextMilestoneCoins,
                milestones:        STREAK_MILESTONES,
                checkedInToday,
                checkinRewardCoins: DAILY_CHECKIN_COINS,
                walletBalance:     user.walletBalance || 0
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/streak/checkin - Instant 1-tap daily login reward
streakRouter.post('/checkin', auth, async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const now = new Date();
        const lastCheckin = user.lastCheckin ? new Date(user.lastCheckin) : null;
        const isAlreadyCheckedIn = Boolean(
            lastCheckin &&
            lastCheckin.getFullYear() === now.getFullYear() &&
            lastCheckin.getMonth() === now.getMonth() &&
            lastCheckin.getDate() === now.getDate()
        );

        if (isAlreadyCheckedIn) {
            return res.status(400).json({
                success: false,
                message: "You've already claimed today's check-in reward! Come back tomorrow."
            });
        }

        const transaction = {
            type:        'CREDIT',
            amount:      DAILY_CHECKIN_COINS,
            description: '🎁 Daily App Check-in Reward',
            date:        now
        };

        const updatedUser = await UserModel.findByIdAndUpdate(
            req.userId,
            {
                $inc: { walletBalance: DAILY_CHECKIN_COINS, coins: DAILY_CHECKIN_COINS },
                $set: { lastCheckin: now },
                $push: {
                    walletTransactions: { $each: [transaction], $position: 0 },
                    checkinHistory: { $each: [now], $slice: -30 }
                }
            },
            { new: true, select: 'walletBalance coins lastCheckin' }
        );

        return res.json({
            success: true,
            message: `🎉 +${DAILY_CHECKIN_COINS} coins added to your wallet!`,
            data: {
                newBalance: updatedUser.walletBalance,
                coins: updatedUser.coins,
                checkedInToday: true
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/streak/claim - Claim milestone bonus
streakRouter.post('/claim', auth, async (req, res) => {
    try {
        const { milestone } = req.body;
        const milestoneNum  = Number(milestone);

        if (!STREAK_MILESTONES[milestoneNum]) {
            return res.status(400).json({ success: false, message: 'Invalid milestone' });
        }

        const coins = STREAK_MILESTONES[milestoneNum];

        const transaction = {
            type:        'CREDIT',
            amount:      coins,
            description: `🔥 ${milestoneNum}-Day Streak Reward`,
            date:        new Date()
        };

        const updatedUser = await UserModel.findOneAndUpdate(
            {
                _id: req.userId,
                currentStreak: { $gte: milestoneNum },
                claimedMilestones: { $ne: milestoneNum }
            },
            {
                $inc: { walletBalance: coins, coins },
                $addToSet: { claimedMilestones: milestoneNum },
                $push: { walletTransactions: { $each: [transaction], $position: 0 } }
            },
            { new: true, select: 'walletBalance coins claimedMilestones' }
        );

        if (!updatedUser) {
            return res.status(400).json({
                success: false,
                message: 'Reward already claimed or streak milestone not reached yet.'
            });
        }

        return res.json({
            success: true,
            message: `🎉 +${coins} coins added to your Snapit Wallet!`,
            data: {
                newBalance: updatedUser.walletBalance,
                claimedMilestones: updatedUser.claimedMilestones
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

export default streakRouter;