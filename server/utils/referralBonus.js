// server/utils/referralBonus.js
// Credits the referral bonus once a referred user's FIRST qualifying order
// (>= MIN_ORDER_AMOUNT) is placed. Called from every order-creation path
// (COD, Wallet, Razorpay) right after the order is saved.
//
// Rules:
//  - Only fires once per user (guarded by firstOrderBonusApplied)
//  - Only fires if the order total meets the minimum
//  - Credits BOTH the referrer and the referred friend ₹5 each
//  - Referrer side is capped at DAILY_REFERRAL_CAP credits/day (anti-fraud)
//  - Never throws — errors are logged and swallowed so a referral hiccup
//    never blocks the order response
import UserModel from '../models/user.model.js'
import { normalizeEmail } from './emailNormalize.js'

const REFERRAL_BONUS_AMOUNT = 5      // ₹5 (shown to users as "10 coins")
const MIN_ORDER_AMOUNT      = 149    // friend's order must be >= this
const DAILY_REFERRAL_CAP    = 5      // max referral credits per referrer per day (anti-fraud)

export async function creditFirstOrderReferralBonus(userId, orderTotalAmt) {
    try {
        if (Number(orderTotalAmt) < MIN_ORDER_AMOUNT) return

        const user = await UserModel.findById(userId)
        if (!user || !user.referredBy || user.firstOrderBonusApplied) return

        const referrer = await UserModel.findOne({ referralCode: user.referredBy })
        if (!referrer) return

        // Anti-abuse: ensure referrer is not the same user (by ID, normalized email, or phone)
        if (referrer._id.equals(user._id)) return
        if (normalizeEmail(referrer.email) === normalizeEmail(user.email)) return
        if (referrer.mobile && user.mobile && String(referrer.mobile) === String(user.mobile)) return

        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)
        const creditsToday = (referrer.walletTransactions || []).filter(
            t => t.type === 'credit' &&
                 t.description?.startsWith('Referral bonus') &&
                 new Date(t.date) >= startOfDay
        ).length

        if (creditsToday >= DAILY_REFERRAL_CAP) return

        // Credit the referrer (10 coins = ₹5)
        await UserModel.updateOne(
            { _id: referrer._id },
            {
                $inc: { walletBalance: REFERRAL_BONUS_AMOUNT, referralCount: 1 },
                $push: {
                    walletTransactions: {
                        type: 'credit',
                        amount: REFERRAL_BONUS_AMOUNT,
                        description: `Referral bonus - 10 coins (₹${REFERRAL_BONUS_AMOUNT}) for inviting ${user.name}!`,
                        date: new Date()
                    }
                }
            }
        )

        // Credit the referred friend too (10 coins = ₹5 welcome bonus on 1st order >= ₹149)
        await UserModel.updateOne(
            { _id: user._id },
            {
                $inc: { walletBalance: REFERRAL_BONUS_AMOUNT },
                $push: {
                    walletTransactions: {
                        type: 'credit',
                        amount: REFERRAL_BONUS_AMOUNT,
                        description: `Referral bonus - 10 coins (₹${REFERRAL_BONUS_AMOUNT}) for your first order!`,
                        date: new Date()
                    }
                },
                $set: { firstOrderBonusApplied: true }
            }
        )
    } catch (error) {
        console.error('[creditFirstOrderReferralBonus] failed:', error.message)
    }
}
