// Zomato/Swiggy-style Psychological Coupon Engine:
// High percentage displayed to customers (30% to 60% OFF), strictly capped at ₹1–₹10 max discount.
const COUPON_RULES = {
  SNAPIT60:    { percent: 60, maxDiscount: 10, minOrder: 99,  label: '60% OFF up to ₹10' },
  WELCOME60:   { percent: 60, maxDiscount: 10, minOrder: 99,  label: '60% OFF up to ₹10' },
  CAKE50:      { percent: 50, maxDiscount: 10, minOrder: 199, label: '50% OFF up to ₹10' },
  BIRYANIFREE: { percent: 40, maxDiscount: 10, minOrder: 99,  label: '40% OFF up to ₹10' },
  FEAST40:     { percent: 40, maxDiscount: 10, minOrder: 99,  label: '40% OFF up to ₹10' },
  SAVE30:      { percent: 30, maxDiscount: 10, minOrder: 99,  label: '30% OFF up to ₹10' },
  SNAPIT:      { percent: 50, maxDiscount: 10, minOrder: 99,  label: '50% OFF up to ₹10' },
  SNAPIT50:    { percent: 50, maxDiscount: 10, minOrder: 99,  label: '50% OFF up to ₹10' },
  FIRSTUSER:   { percent: 60, maxDiscount: 10, minOrder: 99,  label: '60% OFF up to ₹10' },
  FIRSTFREE:   { percent: 50, maxDiscount: 10, minOrder: 99,  label: '50% OFF up to ₹10' },
  FIRST50:     { percent: 50, maxDiscount: 10, minOrder: 99,  label: '50% OFF up to ₹10' },
}

export function validateCoupon(couponCode, subTotalAmt) {
  if (!couponCode) return { code: null, discount: 0, label: '' }

  const code = String(couponCode).trim().toUpperCase()
  const rule = COUPON_RULES[code]

  if (!rule) {
    console.warn(`[validateCoupon] unknown coupon code="${code}", ignoring`)
    return { code: null, discount: 0, label: '' }
  }

  const subtotal = Number(subTotalAmt) || 0
  if (rule.minOrder && subtotal < rule.minOrder) {
    return { code: null, discount: 0, label: '', minOrder: rule.minOrder }
  }

  // Calculate percentage discount (30% to 60%)
  const calculatedDiscount = Math.max(1, Math.round((subtotal * rule.percent) / 100))
  // Hard cap at max ₹10 for all users
  const finalDiscount = Math.min(calculatedDiscount, rule.maxDiscount, 10, subtotal)

  return { code, discount: finalDiscount, label: rule.label }
}