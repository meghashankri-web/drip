import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Full manifest, icons and runtime caching are configured in Step 15.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Drip',
        short_name: 'Drip',
        display: 'standalone',
        theme_color: '#3d2500',
        background_color: '#fcf9f2',
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
  },
})
