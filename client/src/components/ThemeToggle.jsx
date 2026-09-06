import React, { useState, useEffect } from 'react'
import { getStoredTheme, toggleTheme } from '../utils/theme'
import { IoMoon, IoSunny } from 'react-icons/io5'

const ThemeToggle = ({ variant = 'icon', className = '' }) => {
  const [theme, setTheme] = useState(getStoredTheme())
  const isDark = theme === 'dark'

  useEffect(() => {
    const handleThemeChange = (e) => {
      setTheme(e.detail?.theme || getStoredTheme())
    }
    window.addEventListener('snapit_theme_changed', handleThemeChange)
    return () => window.removeEventListener('snapit_theme_changed', handleThemeChange)
  }, [])

  const handleToggle = (e) => {
    e.stopPropagation()
    const next = toggleTheme()
    setTheme(next)
  }

  // ── ROW VARIANT (For UserMenu, UserMenuMobile, Profile Settings) ──
  if (variant === 'row') {
    return (
      <div
        onClick={handleToggle}
        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer select-none transition-all active:scale-[0.98] ${
          isDark
            ? 'bg-slate-800/80 hover:bg-slate-800 text-white'
            : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
        } ${className}`}
        role="button"
        aria-label="Toggle dark mode"
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors ${
              isDark ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {isDark ? <IoMoon size={16} /> : <IoSunny size={17} />}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xs leading-tight">Dark Mode</span>
            <span className="text-[10px] text-slate-400 font-medium">
              {isDark ? 'Obsidian Midnight • ON' : 'Classic Light • OFF'}
            </span>
          </div>
        </div>

        {/* Zomato-style sliding pill toggle switch */}
        <div
          className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-300 ease-in-out ${
            isDark ? 'bg-orange-500' : 'bg-slate-300'
          }`}
        >
          <div
            className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ease-in-out flex items-center justify-center text-[10px] ${
              isDark ? 'translate-x-5 text-orange-500' : 'translate-x-0 text-slate-400'
            }`}
          >
            {isDark ? '🌙' : '☀️'}
          </div>
        </div>
      </div>
    )
  }

  // ── ICON BUTTON VARIANT (For Desktop & Mobile Header) ──
  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 active:scale-90 ${
        isDark
          ? 'bg-slate-800 text-amber-400 hover:bg-slate-700 border border-slate-700 shadow-xs'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80 shadow-xs'
      } ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle dark mode"
    >
      <span className="transition-transform duration-300 transform rotate-0 hover:rotate-12">
        {isDark ? <IoSunny size={18} className="text-amber-400" /> : <IoMoon size={17} className="text-slate-700" />}
      </span>
    </button>
  )
}

export default ThemeToggle
