import TreasuryModel from '../models/treasury.model.js'
import OrderModel from '../models/order.model.js'
import UserModel from '../models/user.model.js'

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

    return response.json({
      success: true,
      message: `Deposit of ₹${numAmount} successfully recorded! 💵`,
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

    const user = await UserModel.findById(request.userId).select('name email role')

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

    return response.json({
      success: true,
      message: `Withdrawal of ₹${numAmount} successfully processed! 💸`,
      data: transaction,
    })
  } catch (error) {
    return response.status(500).json({ success: false, message: error.message })
  }
}
