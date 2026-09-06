// Zomato/Swiggy-style Psychological Coupon Engine:
// Dynamic/random variable ₹1–₹10 surprise discount.
const COUPON_RULES = {
  SNAPIT:      { percent: 30, maxDiscount: 10, minOrder: 99,  label: 'Special Discount' },
  SNAPIT50:    { percent: 50, maxDiscount: 10, minOrder: 99,  label: 'Up to 50% OFF' },
  WELCOME:     { percent: 50, maxDiscount: 10, minOrder: 99,  label: 'Welcome Offer' },
  WELCOME60:   { percent: 50, maxDiscount: 10, minOrder: 99,  label: 'Welcome Offer' },
  SNAPIT60:    { percent: 50, maxDiscount: 10, minOrder: 99,  label: 'Special Offer' },
  CAKE50:      { percent: 50, maxDiscount: 10, minOrder: 99,  label: 'Cake Special' },
  BIRYANIFREE: { percent: 30, maxDiscount: 10, minOrder: 99,  label: 'Biryani Special' },
  FEAST40:     { percent: 40, maxDiscount: 10, minOrder: 99,  label: 'Feast Offer' },
  SAVE30:      { percent: 30, maxDiscount: 10, minOrder: 99,  label: 'Save More' },
  FIRSTUSER:   { percent: 50, maxDiscount: 10, minOrder: 99,  label: 'First Order Offer' },
  FIRSTFREE:   { percent: 50, maxDiscount: 10, minOrder: 99,  label: 'Free Delivery' },
  FIRST50:     { percent: 50, maxDiscount: 10, minOrder: 99,  label: 'First 50' },
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

  // Calculate percent discount
  const calculatedDiscount = Math.max(1, Math.round((subtotal * rule.percent) / 100))
  // Variable random surprise discount between ₹1 and ₹10 (strictly capped at ₹10 max)
  const randomAmount = Math.floor(Math.random() * 10) + 1
  const finalDiscount = Math.max(1, Math.min(randomAmount, calculatedDiscount, rule.maxDiscount, 10, subtotal))

  return { code, discount: finalDiscount, label: rule.label }
}