import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Each of these gets its own lazy chunk
            if (id.includes('leaflet')) return 'chunk-leaflet'
            if (id.includes('recharts') || id.includes('d3')) return 'chunk-charts'
            if (id.includes('swiper')) return 'chunk-swiper'
            if (id.includes('@firebase')) return 'chunk-firebase'
            if (id.includes('socket.io')) return 'chunk-socket'
            if (id.includes('sweetalert2')) return 'chunk-sweetalert'
            if (id.includes('react-dom')) return 'chunk-react-dom'
            if (id.includes('@tanstack')) return 'chunk-tanstack'
            // Everything else vendor
            return 'chunk-vendor'
          }
        }
      }
    },
    chunkSizeWarningLimit: 600,
  }
})
