import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false, // 🔒 Production secure: hides raw source code & node_modules from DevTools
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('leaflet')) return 'chunk-leaflet'
            if (id.includes('recharts') || id.includes('d3-')) return 'chunk-charts'
            if (id.includes('swiper')) return 'chunk-swiper'
            if (id.includes('socket.io-client') || id.includes('engine.io-client')) return 'chunk-socket'
            if (id.includes('sweetalert2')) return 'chunk-sweetalert'
            if (id.includes('react-dom')) return 'chunk-react-dom'
            if (id.includes('@tanstack')) return 'chunk-tanstack'
            if (id.includes('axios')) return 'chunk-axios'
            if (id.includes('@reduxjs') || id.includes('redux')) return 'chunk-redux'
            if (id.includes('react-icons')) return 'chunk-icons'
            if (id.includes('react-router') || id.includes('@remix-run')) return 'chunk-router'
            if (id.includes('immer')) return 'chunk-immer'
            if (id.includes('firebase')) return 'chunk-firebase'
            return 'chunk-vendor'
          }
        }
      }
    },
    chunkSizeWarningLimit: 400,
  }
})