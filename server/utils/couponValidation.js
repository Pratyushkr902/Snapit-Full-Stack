// Server-side coupon validation — the ONLY source of truth for discount
// amounts. Client-supplied couponDiscount is NEVER trusted; only couponCode
// is read from the client, and the discount is looked up here.
//
// TODO(pratyush): confirm these amounts match your actual promo rules —
// the old frontend had a "flat coupon (random ₹1–8)" comment with no
// visible source of truth for the real numbers. Replace as needed.
const COUPON_DISCOUNTS = {
  SNAPIT:     8,
  FIRSTUSER:  8,
  FIRSTFREE:  8,
  FIRST50:    50,
}

const MAX_DISCOUNT = 50 // hard ceiling regardless of what's configured above

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