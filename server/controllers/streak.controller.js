import UserModel from '../models/user.model.js'

const MILESTONES = {
    3:  { reward: '₹20 off',                  type: 'discount',    amount: 20   },
    7:  { reward: 'Free Delivery (3 orders)', type: 'delivery',    amount: 3    },
    14: { reward: '₹100 wallet credit',        type: 'wallet',      amount: 100  },
    30: { reward: 'Snapit Plus FREE',          type: 'snapitplus',  amount: 1    },
}

export async function claimStreakReward(req, res) {
    try {
        const user = await UserModel.findById(req.userId)
        if (!user) return res.status(404).json({ message: "User not found", error: true, success: false })

        const milestone = parseInt(req.body.milestone)
        if (!MILESTONES[milestone]) {
            return res.status(400).json({ message: "Invalid milestone", error: true, success: false })
        }

        if (user.currentStreak < milestone) {
            return res.status(400).json({ message: "Streak not reached yet", error: true, success: false })
        }

        if (user.claimedMilestones.includes(milestone)) {
            return res.status(400).json({ message: "Reward already claimed", error: true, success: false })
        }

        const { type, amount, reward } = MILESTONES[milestone]

        // Apply the reward
        if (type === 'wallet') {
            user.walletBalance += amount
            user.walletTransactions.push({
                type: 'credit',
                amount,
                description: `${milestone}-day streak reward: ${reward}`,
                date: new Date()
            })
        } else if (type === 'snapitplus') {
            user.isSnapitPlusMember = true
            user.snapitPlusExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
        // discount and delivery rewards are stored as claimed — apply at checkout

        user.claimedMilestones.push(milestone)
        await user.save()

        return res.json({
            message: `Reward claimed: ${reward}`,
            error: false,
            success: true,
            data: {
                reward,
                type,
                walletBalance: user.walletBalance
            }
        })
    } catch (error) {
        return res.status(500).json({ message: error.message, error: true, success: false })
    }
}