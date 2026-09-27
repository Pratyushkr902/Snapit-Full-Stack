// server/utils/streakUtils.js
// Authoritative engine for Snapit Daily Streaks, Check-ins, and Loyalty Milestones
// Enforces Indian Standard Time (IST = UTC + 5:30) day boundaries and zero cash loss.

import UserModel from '../models/user.model.js';

// Milestone days → bonus coins reward (100% loyalty coins, zero wallet cash)
export const STREAK_MILESTONES = {
    3:  20,   // 3-day streak  → 20 coins
    7:  50,   // 7-day streak  → 50 coins
    14: 120,  // 14-day streak → 120 coins
    30: 300,  // 30-day streak → 300 coins
};

export const DAILY_CHECKIN_COINS = 5;

/**
 * Normalizes any Date or timestamp to Indian Standard Time (IST) calendar info.
 * Eliminates server UTC time-drift bugs where 1 AM and 11 PM fall into different days.
 */
export function getISTDateInfo(date = new Date()) {
    const dObj = date ? new Date(date) : new Date();
    const istMs = dObj.getTime() + (5.5 * 3600 * 1000);
    const d = new Date(istMs);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    const day = d.getUTCDate();
    const midnightTimestamp = Date.UTC(year, month, day);
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { year, month, day, midnightTimestamp, dateString };
}

/**
 * Checks if two dates fall on the exact same IST calendar day.
 */
export function isSameISTDay(dateA, dateB) {
    if (!dateA || !dateB) return false;
    return getISTDateInfo(dateA).midnightTimestamp === getISTDateInfo(dateB).midnightTimestamp;
}

/**
 * Checks if earlierDate is exactly the day before laterDate in IST.
 */
export function isYesterdayIST(earlierDate, laterDate) {
    if (!earlierDate || !laterDate) return false;
    const diff = getISTDateInfo(laterDate).midnightTimestamp - getISTDateInfo(earlierDate).midnightTimestamp;
    return diff === 86400000;
}

/**
 * Records an order completion for streak progression in IST.
 * Callable safely from both Grocery Orders (order.controller.js) and Food Orders (foodOrder.controller.js).
 */
export async function recordOrderForStreak(userId) {
    try {
        if (!userId) return null;
        const user = await UserModel.findById(userId);
        if (!user) return null;

        const now = new Date();
        const lastOrder = user.lastOrderDate ? new Date(user.lastOrderDate) : null;

        if (lastOrder && isSameISTDay(lastOrder, now)) {
            // Already ordered today in IST — keep streak active, update timestamp
            user.lastOrderDate = now;
            await user.save();
            return { streak: user.currentStreak || 1, streakAlive: true };
        }

        let newStreak = 1;
        if (lastOrder && isYesterdayIST(lastOrder, now)) {
            // Ordered yesterday in IST — increment consecutive streak
            newStreak = (user.currentStreak || 0) + 1;
        } else {
            // First order ever or broken streak — reset to 1
            newStreak = 1;
        }

        user.currentStreak = newStreak;
        user.lastOrderDate = now;
        await user.save();
        console.log(`[STREAK] User ${userId} streak updated to ${newStreak} day(s) (IST)`);
        return { streak: newStreak, streakAlive: true };
    } catch (err) {
        console.error('[recordOrderForStreak ERROR]:', err.message);
        return null;
    }
}

export default recordOrderForStreak;