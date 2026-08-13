import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const KEY_STORAGE_NAME = 'snapit_secure_key_v1'
const isNativeAndroid = () => Capacitor.getPlatform() === 'android'

let cachedCryptoKey = null

async function getOrCreateKey() {
  if (cachedCryptoKey) return cachedCryptoKey

  const existing = await Preferences.get({ key: KEY_STORAGE_NAME })
  if (existing?.value) {
    const raw = Uint8Array.from(atob(existing.value), c => c.charCodeAt(0))
    cachedCryptoKey = await crypto.subtle.importKey(
      'raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
    )
    return cachedCryptoKey
  }

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
  )
  const exported = await crypto.subtle.exportKey('raw', key)
  const b64 = btoa(String.fromCharCode(...new Uint8Array(exported)))
  await Preferences.set({ key: KEY_STORAGE_NAME, value: b64 })

  cachedCryptoKey = key
  return cachedCryptoKey
}

async function encryptValue(plainText) {
  const key = await getOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plainText)
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const combined = new Uint8Array(iv.length + cipherBuf.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(cipherBuf), iv.length)
  return btoa(String.fromCharCode(...combined))
}

async function decryptValue(b64) {
  const key = await getOrCreateKey()
  const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const cipherBuf = combined.slice(12)
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBuf)
  return new TextDecoder().decode(plainBuf)
}

// Drop-in async replacement for localStorage, for sensitive keys only.
// Native Android: AES-GCM encrypted, key stored via Capacitor Preferences.
// Web/iOS: falls through to plain localStorage (unchanged behavior).
const secureStorage = {
  async setItem(key, value) {
    if (!isNativeAndroid()) {
      localStorage.setItem(key, value)
      return
    }
    try {
      const encrypted = await encryptValue(value)
      localStorage.setItem(key, `enc:${encrypted}`)
    } catch (err) {
      console.error('secureStorage.setItem failed, falling back to plain:', err.message)
      localStorage.setItem(key, value)
    }
  },

  async getItem(key) {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    if (!isNativeAndroid() || !raw.startsWith('enc:')) return raw
    try {
      return await decryptValue(raw.slice(4))
    } catch (err) {
      console.error('secureStorage.getItem decrypt failed:', err.message)
      return null
    }
  },

  removeItem(key) {
    localStorage.removeItem(key)
  },
}

export default secureStorage
