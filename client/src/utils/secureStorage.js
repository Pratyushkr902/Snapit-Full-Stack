import { Preferences } from '@capacitor/preferences'

const secureStorage = {
  async setItem(key, value) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value)
        // Also save lowercase alias for maximum compatibility
        if (key === 'accessToken') localStorage.setItem('accesstoken', value)
        if (key === 'refreshToken') localStorage.setItem('refreshtoken', value)
      }
      await Preferences.set({ key, value: String(value) }).catch(() => {})
    } catch (err) {
      console.warn('secureStorage.setItem error:', err?.message)
    }
  },

  async getItem(key) {
    try {
      // 1. Check direct localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        let val = localStorage.getItem(key)
        if (!val && key === 'accessToken') val = localStorage.getItem('accesstoken')
        if (!val && key === 'refreshToken') val = localStorage.getItem('refreshtoken')
        if (val && !val.startsWith('enc:')) return val
      }

      // 2. Check Capacitor Preferences
      const pref = await Preferences.get({ key }).catch(() => null)
      if (pref?.value && !pref.value.startsWith('enc:')) {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(key, pref.value)
        }
        return pref.value
      }

      return null
    } catch (err) {
      console.warn('secureStorage.getItem error:', err?.message)
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key)
      }
      return null
    }
  },

  async removeItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key)
        if (key === 'accessToken') localStorage.removeItem('accesstoken')
        if (key === 'refreshToken') localStorage.removeItem('refreshtoken')
      }
      await Preferences.remove({ key }).catch(() => {})
    } catch (err) {
      console.warn('secureStorage.removeItem error:', err?.message)
    }
  },
}

export default secureStorage
