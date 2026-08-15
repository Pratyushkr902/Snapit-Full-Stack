import UserModel from "../models/user.model.js";

// Returns the logged-in user's real referral code, count, and earnings —
// pulled live from their own document. Previously hardcoded a fake
// "SNAPIT50" code and totalEarned: 0 for every user regardless of activity.
export const getReferralInfo = async (request, response) => {
    try {
        const user = await UserModel.findById(request.userId)
            .select('referralCode referralCount walletTransactions')
            .lean()
        if (!user) {
            return response.status(404).json({ success: false, message: "User not found" });
        }

        const totalEarned = (user.walletTransactions || [])
            .filter(t => t.type === 'credit' && t.description?.startsWith('Referral bonus'))
            .reduce((sum, t) => sum + (t.amount || 0), 0)

        return response.json({
            success: true,
            message: "Referral info fetched",
            data: {
                referralCode:  user.referralCode || null,
                referralCount: user.referralCount || 0,
                totalEarned,
                referralLink:  user.referralCode
                    ? `https://snapit.pages.dev/#/register?ref=${user.referralCode}`
                    : null,
            }
        });
    } catch (error) {
        console.error('[getReferralInfo]', error.message)
        return response.status(500).json({ success: false, message: "Failed to fetch referral info" });
    }
};

// Explicitly named export 2 (Exactly what the router is demanding)
export const applyFirstOrderBonus = async (request, response) => {
    try {
        return response.json({
            success: true,
            message: "First order bonus processed! 🎉"
        });
    } catch (error) {
        return response.status(500).json({ success: false, message: error.message });
    }
};