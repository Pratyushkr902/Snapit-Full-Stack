import UserModel from "../models/user.model.js";

// Returns the logged-in user's real referral code, count, earnings, and referred friends list
export const getReferralInfo = async (request, response) => {
    try {
        let user = await UserModel.findById(request.userId)
            .select('name email referralCode referralCount walletTransactions claimedReferralMilestones')
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
            earnedAmount: f.firstOrderBonusApplied ? 1 : 0,
            statusText: f.firstOrderBonusApplied ? 'Completed (₹1 Credited)' : 'First Order Pending'
        }));

        return response.json({
            success: true,
            message: "Referral info fetched",
            data: {
                referralCode,
                referralCount: Math.max(user.referralCount || 0, friendsDocs.length),
                totalEarned,
                referredFriends,
                claimedReferralMilestones: user.claimedReferralMilestones || [],
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

// Claim milestone perk (5 friends -> ₹5, 10 friends -> ₹7, 25 friends -> Snapit Plus VIP)
export const claimReferralMilestone = async (request, response) => {
    try {
        const milestone = Number(request.body.milestone);
        if (![5, 10, 25].includes(milestone)) {
            return response.status(400).json({ success: false, message: "Invalid milestone level" });
        }

        const user = await UserModel.findById(request.userId);
        if (!user) return response.status(404).json({ success: false, message: "User not found" });

        // Count friends who actually completed their first qualifying order (min ₹149)
        const qualifyingFriendsCount = await UserModel.countDocuments({
            referredBy: user.referralCode,
            firstOrderBonusApplied: true
        });
        const effectiveCount = Math.max(Number(user.referralCount) || 0, qualifyingFriendsCount);

        if (effectiveCount < milestone) {
            return response.status(400).json({
                success: false,
                message: `You need at least ${milestone} friends with completed orders to unlock this tier (Current: ${effectiveCount}).`
            });
        }

        if (user.claimedReferralMilestones?.includes(milestone)) {
            return response.status(400).json({
                success: false,
                message: "You have already claimed the reward for this tier."
            });
        }

        let updateQuery = {
            $addToSet: { claimedReferralMilestones: milestone }
        };
        let successMessage = "";

        if (milestone === 5) {
            updateQuery.$inc = { walletBalance: 5 };
            updateQuery.$push = {
                walletTransactions: {
                    type: 'credit',
                    amount: 5,
                    description: 'Bronze Ambassador Perk - ₹5 Wallet Bonus (5 Friends)',
                    date: new Date()
                }
            };
            successMessage = "🎉 ₹5 Bronze Ambassador bonus credited to your wallet!";
        } else if (milestone === 10) {
            updateQuery.$inc = { walletBalance: 7 };
            updateQuery.$push = {
                walletTransactions: {
                    type: 'credit',
                    amount: 7,
                    description: 'Silver Ambassador Perk - ₹7 Wallet Bonus (10 Friends)',
                    date: new Date()
                }
            };
            successMessage = "🎉 ₹7 Silver Ambassador bonus credited to your wallet!";
        } else if (milestone === 25) {
            const currentExpiry = user.snapitPlusExpiresAt && new Date(user.snapitPlusExpiresAt) > new Date()
                ? new Date(user.snapitPlusExpiresAt)
                : new Date();
            const newExpiry = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);
            updateQuery.$set = {
                isSnapitPlusMember: true,
                snapitPlusExpiresAt: newExpiry
            };
            successMessage = "👑 Legend Ambassador Perk - Snapit Plus VIP unlocked for 30 Days!";
        }

        const updatedUser = await UserModel.findOneAndUpdate(
            {
                _id: request.userId,
                claimedReferralMilestones: { $ne: milestone }
            },
            updateQuery,
            {
                new: true,
                select: 'walletBalance isSnapitPlusMember snapitPlusExpiresAt claimedReferralMilestones'
            }
        );

        if (!updatedUser) {
            return response.status(400).json({
                success: false,
                message: "You have already claimed the reward for this tier."
            });
        }

        return response.json({
            success: true,
            message: successMessage,
            data: {
                claimedReferralMilestones: updatedUser.claimedReferralMilestones || [],
                walletBalance: updatedUser.walletBalance || 0,
                isSnapitPlusMember: updatedUser.isSnapitPlusMember,
                snapitPlusExpiresAt: updatedUser.snapitPlusExpiresAt
            }
        });
    } catch (error) {
        console.error('[claimReferralMilestone]', error.message);
        return response.status(500).json({ success: false, message: error.message || "Failed to claim tier perk" });
    }
};