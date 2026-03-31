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
                    .slice(0, 20)  // last 20 transactions
            }
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

// Add money to wallet
export async function addMoneyToWallet(req, res) {
    try {
        // FIXED: Explicitly cast to Number to handle string inputs from mobile forms
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

        const user = await UserModel.findById(req.userId)
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        // Add bonus for adding Rs. 500 or more
        let bonus = 0
        if (amount >= 500) bonus = Math.floor(amount * 0.05)  // 5% bonus

        const totalCredit = amount + bonus

        user.walletBalance = (user.walletBalance || 0) + totalCredit
        user.walletTransactions.push({
            type: 'credit',
            amount: totalCredit,
            description: bonus > 0
                ? `Added Rs.${amount} + Rs.${bonus} bonus`
                : `Added Rs.${amount} to wallet`,
            date: new Date()
        })

        await user.save()

        return res.json({
            success: true,
            message: bonus > 0
                ? `Rs.${totalCredit} added (includes Rs.${bonus} bonus!)`
                : `Rs.${amount} added to wallet`,
            data: {
                balance: user.walletBalance,
                bonus: bonus
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
        const amount = Number(req.body.amount)
        const { orderId } = req.body

        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment amount'
            })
        }

        const user = await UserModel.findById(req.userId)

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        if ((user.walletBalance || 0) < amount) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient wallet balance'
            })
        }

        user.walletBalance -= amount
        user.walletTransactions.push({
            type: 'debit',
            amount: amount,
            description: `Payment for order #${orderId}`,
            date: new Date()
        })

        await user.save()

        return res.json({
            success: true,
            message: 'Payment successful',
            data: {
                balance: user.walletBalance
            }
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}