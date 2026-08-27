import RiderRemittanceModel from '../models/riderRemittance.model.js';
import OrderModel from '../models/order.model.js';
import UserModel from '../models/user.model.js';
import TreasuryModel from '../models/treasury.model.js';

// Helper: Calculate Rider's current unremitted COD cash in hand
export const calculateRiderCashInHand = async (riderId) => {
  const allCodDeliveredOrders = await OrderModel.find({
    delivery_status: 'Delivered',
    payment_status: /CASH/i,
    riderId
  }).select('totalAmt').lean();

  const totalCodCollected = allCodDeliveredOrders.reduce((sum, o) => sum + (Number(o.totalAmt) || 0), 0);

  const approvedRemittances = await RiderRemittanceModel.find({
    riderId,
    status: 'APPROVED'
  }).select('amount').lean();

  const totalApprovedRemitted = approvedRemittances.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const pendingRemittances = await RiderRemittanceModel.find({
    riderId,
    status: 'PENDING'
  }).select('amount').lean();

  const totalPendingRemitted = pendingRemittances.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  return {
    totalCodCollected,
    totalApprovedRemitted,
    totalPendingRemitted,
    cashInHand: Math.max(0, totalCodCollected - totalApprovedRemitted)
  };
};

// ── 1. Rider Submits Cash Remittance ──────────────────────────────────────────
export const submitRemittanceController = async (req, res) => {
  try {
    const riderId = req.userId;
    const { amount, paymentMethod, transactionId, receiptImage, riderNote } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid deposit amount.' });
    }

    const method = ['CASH', 'BANK_TRANSFER'].includes(paymentMethod) ? paymentMethod : 'UPI';
    let finalTxId = (transactionId || '').trim();

    if (method === 'CASH') {
      if (!finalTxId) {
        finalTxId = `CASH-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    } else {
      if (!finalTxId) {
        return res.status(400).json({ success: false, message: 'UPI UTR or Bank Transaction Reference is required for online deposit.' });
      }
    }

    // Check for duplicate transaction ID
    const existing = await RiderRemittanceModel.findOne({
      transactionId: finalTxId,
      status: { $in: ['PENDING', 'APPROVED'] }
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'This Transaction ID / Reference has already been submitted.'
      });
    }

    const remittance = new RiderRemittanceModel({
      riderId,
      amount: numAmount,
      paymentMethod: method,
      transactionId: finalTxId,
      receiptImage: receiptImage || '',
      riderNote: riderNote || '',
      status: 'PENDING'
    });

    await remittance.save();

    const cashSummary = await calculateRiderCashInHand(riderId);

    return res.status(201).json({
      success: true,
      message: method === 'CASH' 
        ? 'Cash handover request submitted! Super Admin will confirm receipt of physical cash.' 
        : 'Online remittance submitted! Super Admin will verify UPI UTR and approve.',
      data: {
        remittance,
        cashSummary
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit remittance'
    });
  }
};

// ── 2. Rider: Get Personal Remittance History & Cash in Hand ─────────────────
export const getRiderRemittancesController = async (req, res) => {
  try {
    const riderId = req.userId;
    const remittances = await RiderRemittanceModel.find({ riderId })
      .sort({ createdAt: -1 })
      .lean();

    const cashSummary = await calculateRiderCashInHand(riderId);

    return res.status(200).json({
      success: true,
      data: {
        cashSummary,
        remittances
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch remittances'
    });
  }
};

// ── 3. Super Admin & Admin: Get All Remittances ──────────────────────────────
export const getAllRemittancesAdminController = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status && status !== 'ALL') {
      query.status = status.toUpperCase();
    }

    const remittances = await RiderRemittanceModel.find(query)
      .populate('riderId', 'name mobile email avatar role')
      .populate('reviewedBy', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    const pendingCount = await RiderRemittanceModel.countDocuments({ status: 'PENDING' });
    const approvedTotal = await RiderRemittanceModel.aggregate([
      { $match: { status: 'APPROVED' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        pendingCount,
        totalApprovedAmount: approvedTotal?.[0]?.total || 0,
        remittances
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch admin remittances'
    });
  }
};

// ── 4. Super Admin: Approve Remittance ───────────────────────────────────────
export const approveRemittanceController = async (req, res) => {
  try {
    const adminUserId = req.userId;
    const { remittanceId, adminNote } = req.body;

    const remittance = await RiderRemittanceModel.findById(remittanceId).populate('riderId', 'name mobile email');
    if (!remittance) {
      return res.status(404).json({ success: false, message: 'Remittance record not found.' });
    }

    if (remittance.status === 'APPROVED') {
      return res.status(400).json({ success: false, message: 'Remittance is already approved.' });
    }

    remittance.status = 'APPROVED';
    remittance.adminNote = adminNote || 'Approved by Super Admin';
    remittance.reviewedBy = adminUserId;
    remittance.reviewedAt = new Date();
    await remittance.save();

    // Record in Treasury as an approved cash deposit into Super Admin / Bank pool
    try {
      const riderName = remittance.riderId?.name || 'Rider';
      await TreasuryModel.create({
        type: 'DEPOSIT',
        amount: remittance.amount,
        partner: 'SUPER_ADMIN',
        source: remittance.paymentMethod === 'CASH'
          ? `Rider Physical Cash Handover (${riderName}) - Ref: ${remittance.transactionId}`
          : `Rider Online UPI Remittance (${riderName}) - UTR: ${remittance.transactionId}`,
        note: adminNote || `Approved ${remittance.paymentMethod === 'CASH' ? 'cash handover' : 'UPI deposit'} from ${riderName}`
      });
    } catch (treasuryErr) {
      console.warn('[approveRemittanceController] Treasury log warning:', treasuryErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Deposit of ₹${remittance.amount} approved and settled successfully!`,
      data: remittance
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to approve remittance'
    });
  }
};

// ── 5. Super Admin: Reject Remittance ───────────────────────────────────────
export const rejectRemittanceController = async (req, res) => {
  try {
    const adminUserId = req.userId;
    const { remittanceId, adminNote } = req.body;

    if (!adminNote || !adminNote.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a reason for rejection.' });
    }

    const remittance = await RiderRemittanceModel.findById(remittanceId);
    if (!remittance) {
      return res.status(404).json({ success: false, message: 'Remittance record not found.' });
    }

    remittance.status = 'REJECTED';
    remittance.adminNote = adminNote.trim();
    remittance.reviewedBy = adminUserId;
    remittance.reviewedAt = new Date();
    await remittance.save();

    return res.status(200).json({
      success: true,
      message: 'Remittance marked as rejected.',
      data: remittance
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to reject remittance'
    });
  }
};
