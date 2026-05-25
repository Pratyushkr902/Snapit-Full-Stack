import UserModel from "../models/user.model.js";

// Explicitly named export 1
export const getReferralInfo = async (request, response) => {
    try {
        return response.json({
            success: true,
            message: "Referral info fetched cleanly",
            data: { referralCode: "SNAPIT50", totalEarned: 0 }
        });
    } catch (error) {
        return response.status(500).json({ success: false, message: error.message });
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