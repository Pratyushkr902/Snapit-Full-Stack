// Server-side coupon validation — the ONLY source of truth for discount
// amounts. Client-supplied couponDiscount is NEVER trusted; only couponCode
// is read from the client, and the discount is looked up here.
//
// TODO(pratyush): confirm these amounts match your actual promo rules —
// the old frontend had a "flat coupon (random ₹1–8)" comment with no
// visible source of truth for the real numbers. Replace as needed.
const COUPON_DISCOUNTS = {
  SNAPIT:      10,
  FIRSTUSER:   15,
  FIRSTFREE:   15,
  FIRST50:     50,
  GAON50:      50,  // 🎂 6-14km Village & Gaon special offer (Flat ₹50 OFF)
  CAKE50:      50,  // 🎂 Birthday Cake Special (Flat ₹50 OFF)
  BIRYANIFREE: 40,  // 🍗 Restaurant Biryani Free Delivery Subsidy (Flat ₹40 OFF)
  WELCOME50:   50,  // ⚡ New user welcome discount
  VILLAGE50:   50,  // 🏡 Village doorstep delivery discount
}

const MAX_DISCOUNT = 100 // hard ceiling regardless of what's configured above

export function validateCoupon(couponCode, subTotalAmt) {
  if (!couponCode) return { code: null, discount: 0 }

  const code = String(couponCode).trim().toUpperCase()
  const amount = COUPON_DISCOUNTS[code]

  if (!amount) {
    console.warn(`[validateCoupon] unknown coupon code="${code}", ignoring`)
    return { code: null, discount: 0 }
  }

  const discount = Math.min(amount, MAX_DISCOUNT, subTotalAmt)
  return { code, discount }
}