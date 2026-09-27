import UserModel from '../models/user.model.js'
import { STREAK_MILESTONES, isSameISTDay, isYesterdayIST } from '../utils/streakUtils.js'

export async function claimStreakReward(req, res) {
    try {
        const user = await UserModel.findById(req.userId)
        if (!user) return res.status(404).json({ message: "User not found", error: true, success: false })

        const milestone = parseInt(req.body.milestone)
        if (!STREAK_MILESTONES[milestone]) {
            return res.status(400).json({ message: "Invalid milestone", error: true, success: false })
        }

        const now = new Date()
        const orderedToday = Boolean(user.lastOrderDate && isSameISTDay(user.lastOrderDate, now))
        const streakAlive = orderedToday || Boolean(user.lastOrderDate && isYesterdayIST(user.lastOrderDate, now))
        const effectiveStreak = streakAlive ? (user.currentStreak || 0) : 0

        if (effectiveStreak < milestone) {
            return res.status(400).json({ message: "Streak not reached yet or streak has ended", error: true, success: false })
        }

        if (user.claimedMilestones?.includes(milestone)) {
            return res.status(400).json({ message: "Reward already claimed", error: true, success: false })
        }

        const coins = STREAK_MILESTONES[milestone]

        // Zero financial loss protection: Credits Snapit Loyalty Coins ONLY (user.coins)
        user.coins = (user.coins || 0) + coins
        user.claimedMilestones.push(milestone)
        await user.save()

        return res.json({
            message: `🎉 +${coins} Snapit Coins collected for your ${milestone}-day streak!`,
            error: false,
            success: true,
            data: {
                coins: user.coins,
                walletBalance: user.walletBalance || 0,
                claimedMilestones: user.claimedMilestones
            }
        })
    } catch (error) {
        return res.status(500).json({ message: error.message, error: true, success: false })
    }
}