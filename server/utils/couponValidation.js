// Zomato/Swiggy-style Psychological Coupon Engine:
// "Up to 60% OFF" displayed to customers, with a dynamic/random variable ₹1–₹10 surprise discount.
const COUPON_RULES = {
  SNAPIT60:    { percent: 60, maxDiscount: 10, minOrder: 99,  label: 'Up to 60% OFF' },
  WELCOME60:   { percent: 60, maxDiscount: 10, minOrder: 99,  label: 'Up to 60% OFF' },
  CAKE50:      { percent: 60, maxDiscount: 10, minOrder: 99,  label: 'Up to 60% OFF' },
  BIRYANIFREE: { percent: 60, maxDiscount: 10, minOrder: 99,  label: 'Up to 60% OFF' },
  FEAST40:     { percent: 60, maxDiscount: 10, minOrder: 99,  label: 'Up to 60% OFF' },
  SAVE30:      { percent: 60, maxDiscount: 10, minOrder: 99,  label: 'Up to 60% OFF' },
  SNAPIT:      { percent: 60, maxDiscount: 10, minOrder: 99,  label: 'Up to 60% OFF' },
  SNAPIT50:    { percent: 60, maxDiscount: 10, minOrder: 99,  label: 'Up to 60% OFF' },
  FIRSTUSER:   { percent: 60, maxDiscount: 10, minOrder: 99,  label: 'Up to 60% OFF' },
  FIRSTFREE:   { percent: 60, maxDiscount: 10, minOrder: 99,  label: 'Up to 60% OFF' },
  FIRST50:     { percent: 60, maxDiscount: 10, minOrder: 99,  label: 'Up to 60% OFF' },
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

  // Calculate 60% ceiling
  const calculatedDiscount = Math.max(1, Math.round((subtotal * rule.percent) / 100))
  // Variable random surprise discount between ₹1 and ₹10 (strictly capped at ₹10 max)
  const randomAmount = Math.floor(Math.random() * 10) + 1
  const finalDiscount = Math.max(1, Math.min(randomAmount, calculatedDiscount, rule.maxDiscount, 10, subtotal))

  return { code, discount: finalDiscount, label: rule.label }
}