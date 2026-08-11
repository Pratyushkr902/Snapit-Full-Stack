import crypto from 'crypto'

// Single source of truth for Razorpay payment signature verification.
// Used by order.controller.js, foodOrder.controller.js, and payment.controller.js
// so a future security fix only needs to happen in one place.
export const verifyRazorpaySignature = ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  const expectedSignature = crypto
    .createHmac('sha256', String(process.env.RAZORPAY_SECRET_KEY).trim())
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')

  return expectedSignature === razorpay_signature
}
