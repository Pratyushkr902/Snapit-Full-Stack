/**
 * Resolves the official Snapit badge logo URL for payment gateways (Razorpay).
 * Returns a high-resolution 1:1 square brand icon with universal availability
 * across web browsers, mobile viewports, and native Android Capacitor WebViews.
 */
export const getSnapitPaymentLogo = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin
    if (
      origin.startsWith('https://') &&
      !origin.includes('localhost') &&
      !origin.includes('127.0.0.1') &&
      !origin.includes('capacitor://') &&
      !origin.includes('android://')
    ) {
      return `${origin}/snapit-icon-512.png`
    }
  }

  // Universal production URL hosted on Vercel deployment
  return 'https://snapit-client.vercel.app/snapit-icon-512.png'
}

export const SNAPIT_PAYMENT_LOGO = 'https://snapit-client.vercel.app/snapit-icon-512.png'
export default getSnapitPaymentLogo
