// server/utils/coinRedemption.js
// Snapit Loyalty Coin Redemption Engine
// Guardrails prevent financial loss: Min order ₹199, 1 coin = ₹0.10, Max ₹10 off per order

export const COIN_CONVERSION_RATE = 0.10; // 1 coin = ₹0.10 (10 paise per coin)
export const MIN_ORDER_FOR_COINS  = 199;  // Subtotal must be >= ₹199
export const MAX_COIN_DISCOUNT    = 10;   // Max ₹10 discount cap
export const MAX_COINS_PER_ORDER  = 100;  // 100 coins max per transaction

/**
 * Validates and calculates coin redemption discount.
 * Ensures the business NEVER incurs financial loss.
 *
 * @param {number} userCoins - Current coins balance of the user
 * @param {number} requestedCoins - Number of coins user requested to redeem
 * @param {number} subTotalAmt - Cart items subtotal before delivery/platform fees
 * @returns {{ valid: boolean, coinsToDeduct: number, discountAmt: number, reason: string|null }}
 */
export function validateCoinRedemption(userCoins, requestedCoins, subTotalAmt) {
    const numCoins = Number(requestedCoins || 0);
    const subTotal = Number(subTotalAmt || 0);
    const availableCoins = Math.max(0, Number(userCoins || 0));

    if (numCoins <= 0) {
        return { valid: false, coinsToDeduct: 0, discountAmt: 0, reason: null };
    }

    if (subTotal < MIN_ORDER_FOR_COINS) {
        return {
            valid: false,
            coinsToDeduct: 0,
            discountAmt: 0,
            reason: `Minimum order of ₹${MIN_ORDER_FOR_COINS} required to redeem Snapit Coins.`
        };
    }

    if (availableCoins <= 0) {
        return {
            valid: false,
            coinsToDeduct: 0,
            discountAmt: 0,
            reason: 'You have no Snapit Coins available to redeem.'
        };
    }

    // Eligible coins cannot exceed user balance and cannot exceed 100 coins (₹10 cap)
    const eligibleCoins = Math.min(availableCoins, Math.min(numCoins, MAX_COINS_PER_ORDER));

    // Calculate discount in whole rupees (10 coins = ₹1 discount)
    const discountAmt = Math.min(MAX_COIN_DISCOUNT, Math.floor(eligibleCoins * COIN_CONVERSION_RATE));
    const coinsToDeduct = Math.round(discountAmt / COIN_CONVERSION_RATE);

    if (discountAmt <= 0 || coinsToDeduct <= 0) {
        return {
            valid: false,
            coinsToDeduct: 0,
            discountAmt: 0,
            reason: 'At least 10 Snapit Coins required for a ₹1 discount.'
        };
    }

    return {
        valid: true,
        coinsToDeduct,
        discountAmt,
        reason: null
    };
}
