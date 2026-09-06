// ─── Snapit Theme Utility (Light & Dark Mode) ──────────────────────────────────
export const THEME_STORAGE_KEY = 'snapit_theme'

export const getStoredTheme = () => {
  if (typeof window === 'undefined') return 'light'
  const saved = localStorage.getItem(THEME_STORAGE_KEY)
  if (saved === 'dark') return 'dark'
  return 'light'
}

export const applyTheme = (theme) => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
    root.setAttribute('data-theme', 'dark')
  } else {
    root.classList.remove('dark')
    root.setAttribute('data-theme', 'light')
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
    // Dispatch custom event so all active toggles update synchronously
    window.dispatchEvent(new CustomEvent('snapit_theme_changed', { detail: { theme } }))
  } catch (err) {
    console.warn('[Theme] localStorage error:', err)
  }
}

export const toggleTheme = () => {
  const current = getStoredTheme()
  const next = current === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  return next
}

// Initialize theme on script load
if (typeof window !== 'undefined') {
  applyTheme(getStoredTheme())
}

