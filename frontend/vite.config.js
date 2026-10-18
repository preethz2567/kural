import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Kural — Voice-First AI Companion',
        short_name: 'Kural',
        description: 'A voice-first, stage-adaptive companion for older adults, providing a familiar and reassuring presence.',
        theme_color: '#faf5f0',
        background_color: '#faf5f0',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '64x64 192x192 512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/ping': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/chat': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/patient': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/voice': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  }
})
