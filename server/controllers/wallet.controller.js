import UserModel from '../models/user.model.js'

// --- 1. Get Wallet Balance and Transactions ---
export async function getWallet(req, res) {
    try {
        // Ensure req.userId exists (passed from auth middleware)
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
                // Sort by newest date and limit to 20 for performance
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

// --- 2. Add Money to Wallet (with 5% Bonus over Rs. 500) ---
export async function addMoneyToWallet(req, res) {
    try {
        // Force conversion and handle potential string/decimal inputs
        const amount = parseFloat(req.body.amount)

        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Enter a valid numeric amount'
            })
        }

        // Limit to prevent test-account abuse
        if (amount > 10000) {
            return res.status(400).json({
                success: false,
                message: 'Maximum add limit is Rs. 10,000'
            })
        }

        // Snapit Loyalty: 5% bonus for deposits >= 500
        const bonus = amount >= 500 ? Math.floor(amount * 0.05) : 0
        const totalCredit = amount + bonus

        const transaction = {
            type: 'credit',
            amount: totalCredit,
            description: bonus > 0
                ? `Added Rs.${amount} + Rs.${bonus} bonus`
                : `Added Rs.${amount} to wallet`,
            date: new Date()
        }

        // Use findByIdAndUpdate with $inc for atomicity (prevents race conditions)
        const user = await UserModel.findByIdAndUpdate(
            req.userId,
            {
                $inc: { walletBalance: totalCredit },
                $push: { walletTransactions: { $each: [transaction], $position: 0 } } // Push to top
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

// --- 3. Pay Using Wallet ---
export async function payWithWallet(req, res) {
    try {
        const amount = parseFloat(req.body.amount)
        const { orderId } = req.body

        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment amount'
            })
        }

        const user = await UserModel.findById(req.userId).select('walletBalance')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        // Balance Check
        if ((user.walletBalance || 0) < amount) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance. Available: Rs.${user.walletBalance}`
            })
        }

        const transaction = {
            type: 'debit',
            amount: amount,
            description: `Payment for order #${orderId || 'N/A'}`,
            date: new Date()
        }

        const updated = await UserModel.findByIdAndUpdate(
            req.userId,
            {
                $inc: { walletBalance: -amount },
                $push: { walletTransactions: { $each: [transaction], $position: 0 } } // Push to top
            },
            { new: true, select: 'walletBalance' }
        )

        return res.json({
            success: true,
            message: 'Payment successful',
            data: { balance: updated.walletBalance }
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}