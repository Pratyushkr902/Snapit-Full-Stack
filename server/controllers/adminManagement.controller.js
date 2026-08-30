import bcryptjs from 'bcryptjs'
import { listFrozenIps, unfreezeIpByAddress } from '../middleware/abuseGuard.js'
import UserModel from '../models/user.model.js'

export async function createAdminController(request, response) {
    try {
        const { name, email, password } = request.body

        if (!name || !email || !password) {
            return response.status(400).json({
                message: "name, email and password are required",
                error: true,
                success: false
            })
        }

        const existing = await UserModel.findOne({ email })
        if (existing) {
            return response.status(409).json({
                message: "A user with this email already exists",
                error: true,
                success: false
            })
        }

        const salt = await bcryptjs.genSalt(10)
        const hashedPassword = await bcryptjs.hash(password, salt)

        const newAdmin = await UserModel.create({
            name,
            email,
            password: hashedPassword,
            role: 'ADMIN',
            verify_email: true
        })

        const safeAdmin = await UserModel.findById(newAdmin._id).select('-password -refresh_token')

        return response.status(201).json({
            message: "Admin account created",
            error: false,
            success: true,
            data: safeAdmin
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || "Failed to create admin",
            error: true,
            success: false
        })
    }
}

export async function listAdminsController(request, response) {
    try {
        const admins = await UserModel.find({ role: { $in: ['ADMIN', 'SUPER_ADMIN'] } })
            .select('-password -refresh_token')
            .sort({ createdAt: -1 })

        return response.json({
            message: "Admins fetched",
            error: false,
            success: true,
            data: admins
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || "Failed to fetch admins",
            error: true,
            success: false
        })
    }
}

export async function updateAdminStatusController(request, response) {
    try {
        const { adminId } = request.params
        const { status } = request.body

        const target = await UserModel.findById(adminId)
        if (!target) {
            return response.status(404).json({ message: "Admin not found", error: true, success: false })
        }
        if (target.role === 'SUPER_ADMIN') {
            return response.status(403).json({
                message: "Cannot modify another SUPER_ADMIN account",
                error: true,
                success: false
            })
        }

        target.status = status
        await target.save()

        return response.json({
            message: `Admin status updated to ${status}`,
            error: false,
            success: true
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || "Failed to update admin status",
            error: true,
            success: false
        })
    }
}

export async function removeAdminController(request, response) {
    try {
        const { adminId } = request.params

        const target = await UserModel.findById(adminId)
        if (!target) {
            return response.status(404).json({ message: "Admin not found", error: true, success: false })
        }
        if (target.role === 'SUPER_ADMIN') {
            return response.status(403).json({
                message: "Cannot remove a SUPER_ADMIN account",
                error: true,
                success: false
            })
        }

        await UserModel.findByIdAndDelete(adminId)

        return response.json({
            message: "Admin account removed",
            error: false,
            success: true
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || "Failed to remove admin",
            error: true,
            success: false
        })
    }
}


export async function listFrozenIPsController(request, response) {
    try {
        const frozenIps = await listFrozenIps()
        return response.json({
            message: "Frozen IPs fetched",
            error: false,
            success: true,
            data: frozenIps
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || "Failed to fetch frozen IPs",
            error: true,
            success: false
        })
    }
}

export async function unfreezeIPController(request, response) {
    try {
        const { ip } = request.params
        await unfreezeIpByAddress(ip)
        return response.json({
            message: `IP ${ip} unfrozen`,
            error: false,
            success: true
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || "Failed to unfreeze IP",
            error: true,
            success: false
        })
    }
}

export async function listReferralsController(request, response) {
    try {
        // 1. Fetch all users who registered with a referral code
        const referredUsers = await UserModel.find({
            referredBy: { $exists: true, $ne: null, $nin: ['', 'null'] }
        })
            .select('name email mobile referredBy verify_email referralBonusCredited firstOrderBonusApplied createdAt')
            .sort({ createdAt: -1 })
            .lean()

        // 2. Group referred users by referralCode
        const referredByCode = {}
        const referredCodes = new Set()
        for (const u of referredUsers) {
            const code = (u.referredBy || '').trim().toUpperCase()
            if (!code) continue
            referredCodes.add(code)
            if (!referredByCode[code]) referredByCode[code] = []
            referredByCode[code].push({
                _id: u._id,
                name: u.name || 'User',
                email: u.email,
                mobile: u.mobile || 'N/A',
                emailVerified: Boolean(u.verify_email),
                bonusCredited: Boolean(u.referralBonusCredited || u.firstOrderBonusApplied),
                joinedAt: u.createdAt
            })
        }

        // 3. Find all referrer accounts
        const referrers = await UserModel.find({
            $or: [
                { referralCount: { $gt: 0 } },
                { referralCode: { $in: Array.from(referredCodes) } }
            ]
        })
            .select('name email mobile referralCode referralCount walletTransactions walletBalance createdAt')
            .sort({ referralCount: -1, createdAt: -1 })
            .lean()

        // 4. Map referrers data with full details
        const referrersList = referrers.map(r => {
            const code = (r.referralCode || '').trim().toUpperCase()
            const invited = referredByCode[code] || []
            const earned = (r.walletTransactions || [])
                .filter(t => t.type === 'credit' && (t.description || '').toLowerCase().includes('referral'))
                .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

            return {
                referrerId: r._id,
                name: r.name || 'Anonymous User',
                email: r.email,
                mobile: r.mobile || 'N/A',
                referralCode: r.referralCode || 'N/A',
                referralCount: Math.max(Number(r.referralCount) || 0, invited.length),
                walletBalance: Number(r.walletBalance) || 0,
                totalEarned: earned,
                joinedAt: r.createdAt,
                referredUsers: invited
            }
        })

        const totalReferrals = referrersList.reduce((sum, r) => sum + r.referralCount, 0)
        const totalPaidOut = referrersList.reduce((sum, r) => sum + r.totalEarned, 0)

        return response.json({
            message: "Referrals fetched",
            error: false,
            success: true,
            data: {
                summary: {
                    totalReferrers: referrersList.length,
                    totalReferrals,
                    totalPaidOut,
                    totalReferredUsers: referredUsers.length
                },
                referrers: referrersList,
                allReferredUsers: referredUsers
            }
        })
    } catch (error) {
        console.error('[listReferralsController] error:', error)
        return response.status(500).json({
            message: error.message || "Failed to fetch referrals",
            error: true,
            success: false
        })
    }
}

export async function manualCreditReferralBonusController(request, response) {
    try {
        const { userId, amount, reason } = request.body
        if (!userId) {
            return response.status(400).json({ message: "User ID is required", error: true, success: false })
        }
        const creditAmt = Number(amount) || 5
        const user = await UserModel.findById(userId)
        if (!user) {
            return response.status(404).json({ message: "User not found", error: true, success: false })
        }

        await UserModel.findByIdAndUpdate(userId, {
            $inc: { walletBalance: creditAmt, referralCount: 1 },
            $push: {
                walletTransactions: {
                    type: 'credit',
                    amount: creditAmt,
                    description: reason || `Manual Referral Bonus by Admin (₹${creditAmt})`,
                    date: new Date()
                }
            }
        })

        return response.json({
            message: `Successfully credited ₹${creditAmt} referral bonus to ${user.name}!`,
            error: false,
            success: true
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || "Failed to credit referral bonus",
            error: true,
            success: false
        })
    }
}
