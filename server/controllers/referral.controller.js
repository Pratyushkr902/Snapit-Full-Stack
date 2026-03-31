import UserModel from '../models/user.model.js'

// Get my referral code and stats
export async function getReferralInfo(req, res) {
    try {
        const user = await UserModel.findById(req.userId)
            .select('referralCode referralCount walletBalance name')

        const referralLink = `${process.env.FRONTEND_URL}/register?ref=${user.referralCode}`

        return res.json({
            success: true,
            data: {
                referralCode:  user.referralCode,
                referralLink:  referralLink,
                referralCount: user.referralCount,
                totalEarned:   user.referralCount * 20,
                walletBalance: user.walletBalance
            }
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

// Apply referral bonus on first order
export async function applyFirstOrderBonus(req, res) {
    try {
        const user = await UserModel.findById(req.userId)

        // Check if user was referred and hasn't got first order bonus yet
        if (user.referredBy && !user.firstOrderBonusApplied) {
            user.walletBalance += 20
            user.walletTransactions.push({
                type:        'credit',
                amount:      20,
                description: 'Welcome bonus for first order!'
            })
            user.firstOrderBonusApplied = true
            await user.save()

            return res.json({
                success: true,
                message: 'First order bonus of Rs.20 added to wallet!',
                bonus:   20
            })
        }

        return res.json({
            success: true,
            message: 'No bonus applicable',
            bonus:   0
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}