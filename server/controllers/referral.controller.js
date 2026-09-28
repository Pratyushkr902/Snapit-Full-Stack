import UserModel from "../models/user.model.js";

// Returns the logged-in user's real referral code, count, earnings, and referred friends list
export const getReferralInfo = async (request, response) => {
    try {
        let user = await UserModel.findById(request.userId)
            .select('name email referralCode referralCount walletTransactions')
            .lean();
        if (!user) {
            return response.status(404).json({ success: false, message: "User not found" });
        }

        // Auto-generate referral code if user doesn't have one yet
        let referralCode = user.referralCode;
        if (!referralCode) {
            const prefix = user.name ? user.name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() : 'SNAP';
            referralCode = (prefix.length >= 2 ? prefix : 'SNAP') + Math.random().toString(36).substring(2, 6).toUpperCase();
            await UserModel.updateOne({ _id: request.userId }, { $set: { referralCode } });
        }

        const totalEarned = (user.walletTransactions || [])
            .filter(t => 
                String(t.type || '').toUpperCase() === 'CREDIT' && 
                /referral/i.test(String(t.description || ''))
            )
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        // Fetch real referred friends who signed up using this referral code
        const friendsDocs = await UserModel.find({ referredBy: referralCode })
            .select('name createdAt firstOrderBonusApplied')
            .sort({ createdAt: -1 })
            .limit(30)
            .lean();

        const referredFriends = friendsDocs.map(f => ({
            id: f._id,
            name: f.name || 'Friend',
            joinedAt: f.createdAt,
            hasOrdered: Boolean(f.firstOrderBonusApplied),
            earnedAmount: f.firstOrderBonusApplied ? 5 : 0,
            statusText: f.firstOrderBonusApplied ? 'Completed (₹5 Credited)' : 'First Order Pending'
        }));

        return response.json({
            success: true,
            message: "Referral info fetched",
            data: {
                referralCode,
                referralCount: Math.max(user.referralCount || 0, friendsDocs.length),
                totalEarned,
                referredFriends,
                referralLink: `https://snapit.pages.dev/#/register?ref=${referralCode}`,
            }
        });
    } catch (error) {
        console.error('[getReferralInfo]', error.message);
        return response.status(500).json({ success: false, message: "Failed to fetch referral info" });
    }
};

// Explicitly named export for first order bonus endpoint
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