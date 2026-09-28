// route/streak.route.js
import express from 'express';
import auth from '../middleware/auth.js';
import UserModel from '../models/user.model.js';
import {
    STREAK_MILESTONES,
    DAILY_CHECKIN_COINS,
    isSameISTDay,
    isYesterdayIST
} from '../utils/streakUtils.js';

const streakRouter = express.Router();

// GET /api/streak/me - Fetch user streak telemetry & coin balance (IST Timezone Aware)
streakRouter.get('/me', auth, async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId).select(
            'currentStreak lastOrderDate claimedMilestones walletBalance coins lastCheckin checkinHistory'
        );
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const now = new Date();
        const orderedToday = Boolean(user.lastOrderDate && isSameISTDay(user.lastOrderDate, now));
        const streakAlive = orderedToday || Boolean(user.lastOrderDate && isYesterdayIST(user.lastOrderDate, now));
        const checkedInToday = Boolean(user.lastCheckin && isSameISTDay(user.lastCheckin, now));

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
                coins:             user.coins || 0,
                walletBalance:     user.walletBalance || 0
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/streak/checkin - Instant 1-tap daily login reward (Snapit Loyalty Coins ONLY - Zero Wallet Cash Loss)
streakRouter.post('/checkin', auth, async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const now = new Date();
        const isAlreadyCheckedIn = Boolean(user.lastCheckin && isSameISTDay(user.lastCheckin, now));

        if (isAlreadyCheckedIn) {
            return res.status(400).json({
                success: false,
                message: "You've already collected today's check-in coins! Come back tomorrow."
            });
        }

        // Zero financial loss protection: Credits Snapit Loyalty Coins ONLY (user.coins)
        // Never mutates walletBalance and never creates wallet cash transactions
        const updatedUser = await UserModel.findByIdAndUpdate(
            req.userId,
            {
                $inc: { coins: DAILY_CHECKIN_COINS },
                $set: { lastCheckin: now },
                $push: {
                    checkinHistory: { $each: [now], $slice: -30 }
                }
            },
            { new: true, select: 'walletBalance coins lastCheckin' }
        );

        return res.json({
            success: true,
            message: `🎉 +${DAILY_CHECKIN_COINS} Snapit Coins collected!`,
            data: {
                coins: updatedUser.coins || 0,
                walletBalance: updatedUser.walletBalance || 0,
                checkedInToday: true
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/streak/claim - Claim milestone bonus coins (Active streak verified, loyalty coins only)
streakRouter.post('/claim', auth, async (req, res) => {
    try {
        const { milestone } = req.body;
        const milestoneNum  = Number(milestone);

        if (!STREAK_MILESTONES[milestoneNum]) {
            return res.status(400).json({ success: false, message: 'Invalid milestone' });
        }

        const coins = STREAK_MILESTONES[milestoneNum];

        const user = await UserModel.findById(req.userId).select('currentStreak lastOrderDate claimedMilestones');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const now = new Date();
        const orderedToday = Boolean(user.lastOrderDate && isSameISTDay(user.lastOrderDate, now));
        const streakAlive = orderedToday || Boolean(user.lastOrderDate && isYesterdayIST(user.lastOrderDate, now));
        const effectiveStreak = streakAlive ? (user.currentStreak || 0) : 0;

        if (effectiveStreak < milestoneNum) {
            return res.status(400).json({
                success: false,
                message: `Active streak of ${milestoneNum} days required (Current streak: ${effectiveStreak} days).`
            });
        }

        // Zero financial loss protection: Credits Snapit Loyalty Coins ONLY (user.coins)
        const updatedUser = await UserModel.findOneAndUpdate(
            {
                _id: req.userId,
                claimedMilestones: { $ne: milestoneNum }
            },
            {
                $inc: { coins: coins },
                $addToSet: { claimedMilestones: milestoneNum }
            },
            { new: true, select: 'walletBalance coins claimedMilestones' }
        );

        if (!updatedUser) {
            return res.status(400).json({
                success: false,
                message: 'Reward already claimed for this milestone.'
            });
        }

        return res.json({
            success: true,
            message: `🎉 +${coins} Snapit Coins collected for your ${milestoneNum}-day streak!`,
            data: {
                coins: updatedUser.coins || 0,
                walletBalance: updatedUser.walletBalance || 0,
                claimedMilestones: updatedUser.claimedMilestones
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/streak/convert-to-wallet - Convert Snapit Coins to Wallet Cash (10 coins = ₹0.10)
streakRouter.post('/convert-to-wallet', auth, async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId).select('coins walletBalance');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const availableCoins = Math.max(0, Number(user.coins || 0));
        let coinsToConvert = req.body?.coins
            ? Math.floor(Number(req.body.coins) / 10) * 10
            : Math.floor(availableCoins / 10) * 10;

        if (coinsToConvert < 10) {
            return res.status(400).json({
                success: false,
                message: 'At least 10 Snapit Coins required to convert to wallet cash (10 Coins = ₹0.10).'
            });
        }

        if (coinsToConvert > availableCoins) {
            return res.status(400).json({
                success: false,
                message: `Insufficient coins. You have ${availableCoins} coins available.`
            });
        }

        // Conversion rate: 10 coins = ₹0.10 (₹0.01 per coin)
        const cashAmount = Math.round((coinsToConvert / 10) * 0.10 * 100) / 100;
        if (cashAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid conversion amount.'
            });
        }

        const updatedUser = await UserModel.findOneAndUpdate(
            { _id: req.userId, coins: { $gte: coinsToConvert } },
            {
                $inc: {
                    coins: -coinsToConvert,
                    walletBalance: cashAmount
                },
                $push: {
                    walletTransactions: {
                        type: 'credit',
                        amount: cashAmount,
                        description: `Converted ${coinsToConvert} Snapit Coins to Wallet Cash (10 Coins = ₹0.10)`,
                        date: new Date()
                    }
                }
            },
            { new: true, select: 'walletBalance coins' }
        );

        if (!updatedUser) {
            return res.status(400).json({
                success: false,
                message: 'Coin conversion could not be completed. Please try again.'
            });
        }

        return res.json({
            success: true,
            message: `🎉 ₹${cashAmount.toFixed(2)} added to your wallet from ${coinsToConvert} Snapit Coins!`,
            data: {
                coins: updatedUser.coins || 0,
                walletBalance: updatedUser.walletBalance || 0,
                convertedCoins: coinsToConvert,
                creditedAmount: cashAmount
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

export default streakRouter;