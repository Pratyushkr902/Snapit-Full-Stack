// utils/streakUtils.js
// Call this every time a user successfully places an order

import UserModel from '../models/user.model.js';

// Milestone days → coins reward (zero real-money cost)
export const STREAK_MILESTONES = {
    7:  50,   // 7-day streak  → 50 coins
    14: 120,  // 14-day streak → 120 coins
    30: 300,  // 30-day streak → 300 coins
};

export const updateUserStreak = async (userId) => {
    try {
        const user = await UserModel.findById(userId);
        if (!user) return;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // midnight today
        const lastOrder = user.lastOrderDate
            ? new Date(
                user.lastOrderDate.getFullYear(),
                user.lastOrderDate.getMonth(),
                user.lastOrderDate.getDate()
              )
            : null;

        // Already ordered today — don't update streak again
        if (lastOrder && lastOrder.getTime() === today.getTime()) {
            return { streak: user.currentStreak, bonusCoins: 0, milestoneReached: null };
        }

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        let newStreak;

        if (!lastOrder) {
            // First ever order
            newStreak = 1;
        } else if (lastOrder.getTime() === yesterday.getTime()) {
            // Ordered yesterday — continue streak
            newStreak = user.currentStreak + 1;
        } else {
            // Missed a day — reset streak
            newStreak = 1;
        }

        // Check if a milestone was hit AND not already claimed
        let bonusCoins = 0;
        let milestoneReached = null;

        if (STREAK_MILESTONES[newStreak] && !user.claimedMilestones.includes(newStreak)) {
            bonusCoins = STREAK_MILESTONES[newStreak];
            milestoneReached = newStreak;

            // Add coins to wallet
            user.walletBalance = (user.walletBalance || 0) + bonusCoins;
            user.walletTransactions.push({
                type: 'CREDIT',
                amount: bonusCoins,
                description: `🔥 ${newStreak}-Day Streak Reward`,
                date: new Date()
            });
            user.claimedMilestones.push(newStreak);
        }

        user.currentStreak = newStreak;
        user.lastOrderDate = now;
        await user.save();

        return { streak: newStreak, bonusCoins, milestoneReached };
    } catch (err) {
        console.error('Streak update failed:', err);
        return { streak: 0, bonusCoins: 0, milestoneReached: null };
    }
};