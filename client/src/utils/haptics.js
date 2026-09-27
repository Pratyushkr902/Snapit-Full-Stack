/**
 * Safe haptic feedback utility for mobile WebView and Android Capacitor.
 * Uses navigator.vibrate if available; gracefully no-ops on desktop / unsupported platforms.
 * Wrapped in a safe Proxy so calling any undeclared method never throws a runtime TypeError.
 */
const rawHaptic = {
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
   * Selection feedback for radio cards, plan pickers, segmented tabs
   */
  selection: () => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(12)
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
   * Heavy feedback (e.g., critical destructive action, subscription cancellation, checkout confirm)
   */
  heavy: () => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([30, 20, 30])
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
  },

  /**
   * Error pattern
   */
  error: () => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([40, 50, 40])
      }
    } catch {
      // Ignore vibration error on unsupported devices
    }
  }
}

// Fail-safe Proxy: any method call like haptic.xyz() returns a safe no-op if undefined
export const haptic = new Proxy(rawHaptic, {
  get: (target, prop) => {
    if (prop in target) {
      return target[prop]
    }
    // Return safe no-op function for any missing method
    return () => {}
  }
})

export default haptic
