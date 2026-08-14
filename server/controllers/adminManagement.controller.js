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
        // Referrers: any user who has successfully referred at least one person
        const referrers = await UserModel.find({ referralCount: { $gt: 0 } })
            .select('name email mobile referralCode referralCount walletTransactions createdAt')
            .sort({ referralCount: -1 })

        // For each referrer, find everyone they referred (matched by referralCode)
        const referrerCodes = referrers.map(r => r.referralCode).filter(Boolean)
        const referredUsers = await UserModel.find({ referredBy: { $in: referrerCodes } })
            .select('name email mobile referredBy verify_email referralBonusCredited createdAt')

        const referredByCode = {}
        for (const u of referredUsers) {
            if (!referredByCode[u.referredBy]) referredByCode[u.referredBy] = []
            referredByCode[u.referredBy].push({
                name: u.name,
                email: u.email,
                mobile: u.mobile,
                emailVerified: u.verify_email,
                bonusCredited: u.referralBonusCredited,
                joinedAt: u.createdAt
            })
        }

        const data = referrers.map(r => {
            const earned = (r.walletTransactions || [])
                .filter(t => t.type === 'credit' && t.description?.startsWith('Referral bonus'))
                .reduce((sum, t) => sum + (t.amount || 0), 0)

            return {
                referrerId: r._id,
                name: r.name,
                email: r.email,
                mobile: r.mobile,
                referralCode: r.referralCode,
                referralCount: r.referralCount,
                totalEarned: earned,
                joinedAt: r.createdAt,
                referredUsers: referredByCode[r.referralCode] || []
            }
        })

        const totalReferrals = data.reduce((sum, r) => sum + r.referralCount, 0)
        const totalPaidOut = data.reduce((sum, r) => sum + r.totalEarned, 0)

        return response.json({
            message: "Referrals fetched",
            error: false,
            success: true,
            data: {
                summary: {
                    totalReferrers: data.length,
                    totalReferrals,
                    totalPaidOut
                },
                referrers: data
            }
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || "Failed to fetch referrals",
            error: true,
            success: false
        })
    }
}
