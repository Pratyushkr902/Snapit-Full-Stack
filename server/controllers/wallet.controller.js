import UserModel from '../models/user.model.js'
import WithdrawalModel from '../models/withdrawal.model.js'

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

// --- 4. Request Withdrawal to UPI (manual admin-approval flow) ---
// Deducts wallet balance immediately (atomic, with insufficient-balance guard)
// and creates a PENDING record. An admin manually sends the UPI payout and
// approves/rejects the request. Rejection refunds the wallet.
export async function requestWithdrawal(req, res) {
    try {
        const amount = parseFloat(req.body.amount)
        const upiId = (req.body.upiId || '').trim()

        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Enter a valid numeric amount'
            })
        }

        if (amount < 50) {
            return res.status(400).json({
                success: false,
                message: 'Minimum withdrawal is Rs.50'
            })
        }

        if (!upiId) {
            return res.status(400).json({
                success: false,
                message: 'Enter a valid UPI ID'
            })
        }

        // Basic UPI ID shape check: someid@bank
        if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId)) {
            return res.status(400).json({
                success: false,
                message: 'Enter a valid UPI ID (e.g. name@bank)'
            })
        }

        // Atomic conditional deduct: only succeeds if walletBalance >= amount,
        // preventing race conditions where two withdrawal requests fire together.
        const transaction = {
            type: 'debit',
            amount: amount,
            description: `Withdrawal requested to ${upiId}`,
            date: new Date()
        }

        const updatedUser = await UserModel.findOneAndUpdate(
            { _id: req.userId, walletBalance: { $gte: amount } },
            {
                $inc: { walletBalance: -amount },
                $push: { walletTransactions: { $each: [transaction], $position: 0 } }
            },
            { new: true, select: 'walletBalance' }
        )

        if (!updatedUser) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient wallet balance'
            })
        }

        const withdrawal = await WithdrawalModel.create({
            userId: req.userId,
            amount,
            upiId,
            status: 'PENDING'
        })

        return res.json({
            success: true,
            message: `Withdrawal of Rs.${amount} requested! It will be processed in 2-4 business days.`,
            data: {
                balance: updatedUser.walletBalance,
                withdrawalId: withdrawal._id
            }
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

// --- 5. Admin: List withdrawal requests ---
export async function listWithdrawals(req, res) {
    try {
        const filter = {}
        if (req.query.status) filter.status = req.query.status

        const withdrawals = await WithdrawalModel.find(filter)
            .populate('userId', 'name email mobile')
            .sort({ createdAt: -1 })

        return res.json({
            success: true,
            data: withdrawals
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

// --- 6. Admin: Approve a withdrawal (admin has sent the UPI payout manually) ---
export async function approveWithdrawal(req, res) {
    try {
        const { withdrawalId } = req.body
        const withdrawal = await WithdrawalModel.findById(withdrawalId)

        if (!withdrawal) {
            return res.status(404).json({ success: false, message: 'Withdrawal not found' })
        }
        if (withdrawal.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: `Already ${withdrawal.status}` })
        }

        withdrawal.status = 'APPROVED'
        withdrawal.processedAt = new Date()
        await withdrawal.save()

        return res.json({ success: true, message: 'Withdrawal marked as approved/paid' })
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message })
    }
}

// --- 7. Admin: Reject a withdrawal (refunds the wallet) ---
export async function rejectWithdrawal(req, res) {
    try {
        const { withdrawalId, reason } = req.body
        const withdrawal = await WithdrawalModel.findById(withdrawalId)

        if (!withdrawal) {
            return res.status(404).json({ success: false, message: 'Withdrawal not found' })
        }
        if (withdrawal.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: `Already ${withdrawal.status}` })
        }

        const refundTransaction = {
            type: 'credit',
            amount: withdrawal.amount,
            description: `Withdrawal rejected - refunded to wallet${reason ? ` (${reason})` : ''}`,
            date: new Date()
        }

        await UserModel.findByIdAndUpdate(
            withdrawal.userId,
            {
                $inc: { walletBalance: withdrawal.amount },
                $push: { walletTransactions: { $each: [refundTransaction], $position: 0 } }
            }
        )

        withdrawal.status = 'REJECTED'
        withdrawal.adminNote = reason || ''
        withdrawal.processedAt = new Date()
        await withdrawal.save()

        return res.json({ success: true, message: 'Withdrawal rejected and amount refunded to wallet' })
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message })
    }
}
