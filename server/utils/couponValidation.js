// Zomato/Swiggy-style Psychological Coupon Engine:
// High percentage displayed to customers (40%-60% OFF), strictly capped at ₹6-₹10 max discount.
const COUPON_RULES = {
  GAON60:      { percent: 60, maxDiscount: 10, minOrder: 149, label: '60% OFF up to ₹10' },
  GAON50:      { percent: 50, maxDiscount: 8,  minOrder: 149, label: '50% OFF up to ₹8' },
  CAKE50:      { percent: 50, maxDiscount: 10, minOrder: 249, label: '50% OFF up to ₹10' },
  BIRYANIFREE: { percent: 40, maxDiscount: 9,  minOrder: 129, label: '40% OFF up to ₹9' },
  WELCOME60:   { percent: 60, maxDiscount: 10, minOrder: 99,  label: '60% OFF up to ₹10' },
  WELCOME50:   { percent: 50, maxDiscount: 8,  minOrder: 99,  label: '50% OFF up to ₹8' },
  SNAPIT:      { percent: 50, maxDiscount: 7,  minOrder: 99,  label: '50% OFF up to ₹7' },
  SNAPIT50:    { percent: 50, maxDiscount: 8,  minOrder: 99,  label: '50% OFF up to ₹8' },
  FIRSTUSER:   { percent: 60, maxDiscount: 10, minOrder: 99,  label: '60% OFF up to ₹10' },
  FIRSTFREE:   { percent: 50, maxDiscount: 8,  minOrder: 99,  label: '50% OFF up to ₹8' },
  FIRST50:     { percent: 50, maxDiscount: 10, minOrder: 99,  label: '50% OFF up to ₹10' },
  VILLAGE60:   { percent: 60, maxDiscount: 10, minOrder: 149, label: '60% OFF up to ₹10' },
  VILLAGE50:   { percent: 50, maxDiscount: 8,  minOrder: 149, label: '50% OFF up to ₹8' },
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

  // Calculate percentage discount (e.g. 60% of subtotal)
  const calculatedDiscount = Math.round((subtotal * rule.percent) / 100)
  // Hard cap at maxDiscount (e.g. max ₹10 to ₹15)
  const finalDiscount = Math.min(calculatedDiscount, rule.maxDiscount, subtotal)

  return { code, discount: finalDiscount, label: rule.label }
}