import UserModel from '../models/user.model.js'

// Get wallet balance and transactions
export async function getWallet(req, res) {
    try {
        const user = await UserModel.findById(req.userId)
            .select('walletBalance walletTransactions')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        return res.json({
            success: true,
            data: {
                balance: user.walletBalance || 0,
                transactions: (user.walletTransactions || [])
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 20)
            }
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

// Add money to wallet - using $inc to avoid pre-save middleware issues
export async function addMoneyToWallet(req, res) {
    try {
        const amount = Number(req.body.amount)

        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Enter a valid numeric amount'
            })
        }

        if (amount > 10000) {
            return res.status(400).json({
                success: false,
                message: 'Maximum add limit is Rs. 10,000'
            })
        }

        const bonus        = amount >= 500 ? Math.floor(amount * 0.05) : 0
        const totalCredit  = amount + bonus

        const transaction  = {
            type:        'credit',
            amount:      totalCredit,
            description: bonus > 0
                ? `Added Rs.${amount} + Rs.${bonus} bonus`
                : `Added Rs.${amount} to wallet`,
            date: new Date()
        }

        // Use findByIdAndUpdate with $inc to bypass pre-save middleware
        const user = await UserModel.findByIdAndUpdate(
            req.userId,
            {
                $inc:  { walletBalance: totalCredit },
                $push: { walletTransactions: transaction }
            },
            { new: true, select: 'walletBalance' }
        )

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        return res.json({
            success: true,
            message: bonus > 0
                ? `Rs.${totalCredit} added! (includes Rs.${bonus} bonus)`
                : `Rs.${amount} added to wallet`,
            data: {
                balance: user.walletBalance,
                bonus:   bonus
            }
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

// Pay using wallet
export async function payWithWallet(req, res) {
    try {
        const amount    = Number(req.body.amount)
        const { orderId } = req.body

        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment amount'
            })
        }

        const user = await UserModel.findById(req.userId)
            .select('walletBalance')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        if ((user.walletBalance || 0) < amount) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance. Available: Rs.${user.walletBalance}`
            })
        }

        const transaction = {
            type:        'debit',
            amount:      amount,
            description: `Payment for order #${orderId || 'N/A'}`,
            date:        new Date()
        }

        const updated = await UserModel.findByIdAndUpdate(
            req.userId,
            {
                $inc:  { walletBalance: -amount },
                $push: { walletTransactions: transaction }
            },
            { new: true, select: 'walletBalance' }
        )

        return res.json({
            success: true,
            message: 'Payment successful',
            data:    { balance: updated.walletBalance }
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}