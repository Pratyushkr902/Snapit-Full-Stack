/** @type {import('tailwindcss').Config} */
export default {
  // ─── Kept: darkMode by class is correct ───────────────────────────────────
  darkMode: 'class',

  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        // Brand colors
        "primary-200": "#ffbf00",
        "primary-100": "#ffc929",
        "secondary-200": "#00b050",
        "secondary-100": "#0b1a78",

        // ─── REMOVED: "midnight", "slate-card", "neon-green" were never used ─
        // Dead config that confuses the team. Re-add if you actually use them.
      },

      // ─── ADDED: Safe area spacing for iOS home indicator + Android nav bar ─
      // Use pb-safe, pt-safe etc. in components that need edge-to-edge layout.
      spacing: {
        'safe-top':    'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left':   'env(safe-area-inset-left)',
        'safe-right':  'env(safe-area-inset-right)',
      },

      // ─── ADDED: Standard mobile border radii ──────────────────────────────
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },

      // ─── ADDED: Font size for tiny mobile labels ──────────────────────────
      fontSize: {
        'xxs': ['0.625rem', { lineHeight: '0.875rem' }],
      },

      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },

      // ─── ADDED: Standard mobile-app box shadows ───────────────────────────
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'float': '0 8px 30px rgba(0,0,0,0.12)',
      },
    },
  },

  plugins: [],
}