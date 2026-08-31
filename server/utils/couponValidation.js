// Zomato/Swiggy-style Psychological Coupon Engine:
// High percentage displayed to customers (50%-60% OFF), strictly capped at ₹10-₹20 max discount.
const COUPON_RULES = {
  // 60% OFF up to ₹15 (Blinkit/Zomato style)
  GAON60:      { percent: 60, maxDiscount: 15, minOrder: 149, label: '60% OFF up to ₹15' },
  GAON50:      { percent: 50, maxDiscount: 12, minOrder: 149, label: '50% OFF up to ₹12' },
  CAKE50:      { percent: 50, maxDiscount: 20, minOrder: 249, label: '50% OFF up to ₹20' },
  BIRYANIFREE: { percent: 40, maxDiscount: 15, minOrder: 129, label: '40% OFF up to ₹15' },
  WELCOME60:   { percent: 60, maxDiscount: 15, minOrder: 99,  label: '60% OFF up to ₹15' },
  WELCOME50:   { percent: 50, maxDiscount: 12, minOrder: 99,  label: '50% OFF up to ₹12' },
  SNAPIT:      { percent: 50, maxDiscount: 10, minOrder: 99,  label: '50% OFF up to ₹10' },
  SNAPIT50:    { percent: 50, maxDiscount: 10, minOrder: 99,  label: '50% OFF up to ₹10' },
  FIRSTUSER:   { percent: 60, maxDiscount: 15, minOrder: 99,  label: '60% OFF up to ₹15' },
  FIRSTFREE:   { percent: 50, maxDiscount: 12, minOrder: 99,  label: '50% OFF up to ₹12' },
  FIRST50:     { percent: 50, maxDiscount: 15, minOrder: 99,  label: '50% OFF up to ₹15' },
  VILLAGE60:   { percent: 60, maxDiscount: 15, minOrder: 149, label: '60% OFF up to ₹15' },
  VILLAGE50:   { percent: 50, maxDiscount: 12, minOrder: 149, label: '50% OFF up to ₹12' },
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