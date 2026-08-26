import TreasuryModel from '../models/treasury.model.js'
import OrderModel from '../models/order.model.js'
import UserModel from '../models/user.model.js'
import WalletModel from '../models/wallet.model.js'

// Helper to credit or debit user's real Snapit App Wallet
const updateSnapitUserWallet = async (userId, amount, type, description) => {
  try {
    const numAmount = Math.abs(Number(amount))
    const user = await UserModel.findById(userId)
    if (!user) return

    if (type === 'credit') {
      user.walletBalance = (Number(user.walletBalance) || 0) + numAmount
      user.walletTransactions.push({
        type: 'credit',
        amount: numAmount,
        description,
        date: new Date(),
      })
    } else if (type === 'debit') {
      user.walletBalance = Math.max(0, (Number(user.walletBalance) || 0) - numAmount)
      user.walletTransactions.push({
        type: 'debit',
        amount: numAmount,
        description,
        date: new Date(),
      })
    }
    await user.save()

    // Sync WalletModel if exists
    let wallet = await WalletModel.findOne({ userId })
    if (!wallet) {
      wallet = new WalletModel({ userId, balance: user.walletBalance, transactions: [] })
    }
    wallet.balance = user.walletBalance
    wallet.transactions.push({
      amount: numAmount,
      type: type === 'credit' ? 'credit' : 'debit',
      description,
      date: new Date(),
    })
    await wallet.save()
  } catch (err) {
    console.error('[updateSnapitUserWallet] Error syncing wallet:', err.message)
  }
}

export const getTreasurySummary = async (request, response) => {
  try {
    // 1. Calculate Total COD collected from Delivered orders
    const codOrders = await OrderModel.find({
      payment_status: /CASH/i,
      delivery_status: 'Delivered',
    }).select('orderId totalAmt createdAt updatedAt delivery_status payment_status').lean()

    const totalCodCollected = codOrders.reduce((sum, o) => sum + (Number(o.totalAmt) || 0), 0)

    // 2. Calculate Total Online payments
    const onlineOrders = await OrderModel.find({
      payment_status: 'PAID',
      delivery_status: 'Delivered',
    }).select('orderId totalAmt createdAt updatedAt delivery_status payment_status').lean()

    const totalOnlineRevenue = onlineOrders.reduce((sum, o) => sum + (Number(o.totalAmt) || 0), 0)

    // 3. Fetch Treasury transactions (Deposits & Withdrawals)
    const transactions = await TreasuryModel.find({}).sort({ createdAt: -1 }).limit(100).lean()

    let totalDeposits = 0
    let totalWithdrawals = 0
    let superAdminWithdrawn = 0
    let partnerWithdrawn = 0

    transactions.forEach(t => {
      const amt = Number(t.amount) || 0
      if (t.type === 'DEPOSIT') {
        totalDeposits += amt
      } else if (t.type === 'WITHDRAWAL') {
        totalWithdrawals += amt
        if (t.partner === 'SUPER_ADMIN') {
          superAdminWithdrawn += amt
        } else if (t.partner === 'PARTNER_ADMIN') {
          partnerWithdrawn += amt
        }
      }
    })

    // Total Cash Pool = COD Collected + Manual Cash Deposits - Withdrawals
    const totalCashPool = totalCodCollected + totalDeposits
    const availableCashBalance = Math.max(0, totalCashPool - totalWithdrawals)

    // Partner Split (50% Super Admin, 50% Partner Admin)
    const totalDistributable = Math.max(0, totalCashPool)
    const perPartnerShare = totalDistributable / 2
    const superAdminAvailable = Math.max(0, perPartnerShare - superAdminWithdrawn)
    const partnerAvailable = Math.max(0, perPartnerShare - partnerWithdrawn)

    // Fetch current real Snapit wallet balance of the requesting user
    const currentUser = await UserModel.findById(request.userId).select('walletBalance role name email')

    return response.json({
      success: true,
      data: {
        summary: {
          totalCodCollected,
          codOrderCount: codOrders.length,
          totalOnlineRevenue,
          onlineOrderCount: onlineOrders.length,
          totalDeposits,
          totalWithdrawals,
          availableCashBalance,
          currentUserWalletBalance: currentUser?.walletBalance || 0,
          partnerSplit: {
            superAdmin: {
              label: 'Super Admin (You)',
              sharePercent: 50,
              totalEntitled: perPartnerShare,
              withdrawn: superAdminWithdrawn,
              available: superAdminAvailable,
            },
            partnerAdmin: {
              label: 'Admin (Partner)',
              sharePercent: 50,
              totalEntitled: perPartnerShare,
              withdrawn: partnerWithdrawn,
              available: partnerAvailable,
            },
          },
        },
        transactions,
      },
    })
  } catch (error) {
    console.error('[getTreasurySummary] error:', error.message)
    return response.status(500).json({ success: false, message: error.message })
  }
}

export const recordDeposit = async (request, response) => {
  try {
    const { amount, paymentMethod = 'CASH', notes = '', referenceId = '' } = request.body

    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) {
      return response.status(400).json({ success: false, message: 'Valid deposit amount is required' })
    }

    const user = await UserModel.findById(request.userId).select('name email role')

    const transaction = await TreasuryModel.create({
      type: 'DEPOSIT',
      amount: numAmount,
      paymentMethod,
      partner: user.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'PARTNER_ADMIN',
      notes,
      referenceId,
      recordedBy: user._id,
      recordedByName: user.name,
      recordedByEmail: user.email,
    })

    // ✅ DEPOSIT REAL MONEY DIRECTLY INTO USER'S SNAPIT WALLET
    await updateSnapitUserWallet(
      user._id,
      numAmount,
      'credit',
      `Cash Deposit into Snapit Wallet (${paymentMethod}) - ${notes || 'Treasury cash entry'}`
    )

    return response.json({
      success: true,
      message: `Deposit of ₹${numAmount} credited to your Snapit Wallet successfully! 💵`,
      data: transaction,
    })
  } catch (error) {
    return response.status(500).json({ success: false, message: error.message })
  }
}

export const recordWithdrawal = async (request, response) => {
  try {
    const { amount, partner = 'SUPER_ADMIN', paymentMethod = 'CASH', notes = '', referenceId = '' } = request.body

    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) {
      return response.status(400).json({ success: false, message: 'Valid withdrawal amount is required' })
    }

    const user = await UserModel.findById(request.userId).select('name email role walletBalance')

    // Verify user role has access
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return response.status(403).json({ success: false, message: 'Access denied: Admin role required' })
    }

    const transaction = await TreasuryModel.create({
      type: 'WITHDRAWAL',
      amount: numAmount,
      paymentMethod,
      partner: user.role === 'SUPER_ADMIN' ? (partner || 'SUPER_ADMIN') : 'PARTNER_ADMIN',
      notes,
      referenceId,
      recordedBy: user._id,
      recordedByName: user.name,
      recordedByEmail: user.email,
    })

    // ✅ DEDUCT REAL MONEY FROM SNAPIT WALLET
    await updateSnapitUserWallet(
      user._id,
      numAmount,
      'debit',
      `Wallet Cash Payout / Withdrawal (${paymentMethod}) - ${notes || 'Partner profit withdrawal'}`
    )

    return response.json({
      success: true,
      message: `Withdrawal of ₹${numAmount} processed & updated in Snapit Wallet! 💸`,
      data: transaction,
    })
  } catch (error) {
    return response.status(500).json({ success: false, message: error.message })
  }
}

// ✅ 1-CLICK ACTION: DISTRIBUTE / DEPOSIT COD CASH TO PARTNER WALLETS
export const distributeCodToWallets = async (request, response) => {
  try {
    const user = await UserModel.findById(request.userId).select('role name')
    if (user.role !== 'SUPER_ADMIN') {
      return response.status(403).json({ success: false, message: 'Only Super Admin can trigger COD cash distribution' })
    }

    const { amount } = request.body
    const totalDistribute = Number(amount)
    if (!totalDistribute || totalDistribute <= 0) {
      return response.status(400).json({ success: false, message: 'Enter a valid distribution amount' })
    }

    // Find Partner Admins
    const superAdmin = await UserModel.findOne({ role: 'SUPER_ADMIN' })
    const partnerAdmin = await UserModel.findOne({ role: 'ADMIN', email: 'raghurishav54321@gmail.com' }) || await UserModel.findOne({ role: 'ADMIN' })

    const halfShare = Math.round(totalDistribute / 2)

    if (superAdmin) {
      await updateSnapitUserWallet(
        superAdmin._id,
        halfShare,
        'credit',
        `COD Revenue Distribution (50% Partner Share)`
      )
    }

    if (partnerAdmin) {
      await updateSnapitUserWallet(
        partnerAdmin._id,
        halfShare,
        'credit',
        `COD Revenue Distribution (50% Partner Share)`
      )
    }

    // Record Treasury Entry
    await TreasuryModel.create({
      type: 'DEPOSIT',
      amount: totalDistribute,
      paymentMethod: 'CASH',
      partner: 'GENERAL_TREASURY',
      notes: `50/50 COD Cash split deposited directly into Super Admin and Admin Snapit Wallets (₹${halfShare} each)`,
      recordedBy: user._id,
      recordedByName: user.name,
    })

    return response.json({
      success: true,
      message: `₹${totalDistribute} COD Cash deposited into Snapit Wallets! (₹${halfShare} to Super Admin, ₹${halfShare} to Admin) 🎉`,
    })
  } catch (error) {
    return response.status(500).json({ success: false, message: error.message })
  }
}
