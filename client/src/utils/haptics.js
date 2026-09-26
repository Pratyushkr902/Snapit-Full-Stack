/**
 * Safe haptic feedback utility for mobile WebView and Android Capacitor.
 * Uses navigator.vibrate if available; gracefully no-ops on desktop / unsupported platforms.
 */
export const haptic = {
  /**
   * Ultra-light click / tap feedback (e.g., +/- button press, tab switch)
   */
  light: () => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10)
      }
    } catch {
      // Ignore vibration error on unsupported devices
    }
  },

  /**
   * Medium feedback (e.g., selecting tip, toggling option, adding first item to cart)
   */
  medium: () => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(22)
      }
    } catch {
      // Ignore vibration error on unsupported devices
    }
  },

  /**
   * Success celebration pattern (e.g., order placed, coupon applied, scratch card won)
   */
  success: () => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([15, 45, 25])
      }
    } catch {
      // Ignore vibration error on unsupported devices
    }
  },

  /**
   * Warning / error pattern (e.g., cart max reached, validation error)
   */
  warning: () => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([35, 60, 35])
      }
    } catch {
      // Ignore vibration error on unsupported devices
    }
  }
}

export default haptic
