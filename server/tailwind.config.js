/** @type {import('tailwindcss').Config} */
export default {
  // 1. ENABLE DARK MODE: This allows you to toggle themes by adding 'dark' to the <html> tag
  darkMode: 'class', 
  
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Fixed: Added JSX/TSX explicitly to ensure all components are styled
  ],
  theme: {
    extend: {
      colors : {
        // Your Existing Brand Colors
        "primary-200" : "#ffbf00",
        "primary-100" : "#ffc929",
        "secondary-200" : "#00b050",
        "secondary-100" : "#0b1a78",

        // NEW: Dark Mode Palette for Snapit 2.0
        "midnight" : "#0A0A0A", // OLED Black for battery saving
        "slate-card" : "#121212", // Professional card background
        "neon-green" : "#00FF41", // High-visibility logistics accent
      },
      // NEW: Added a smooth transition for theme switching
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      }
    },
  },
  plugins: [],
}