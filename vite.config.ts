import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null, // We will register the service worker manually to avoid Electron issues
      includeAssets: ['favicon.svg', 'logo.png', 'icons.svg'],
      manifest: {
        name: 'Farmaal',
        short_name: 'Farmaal',
        description: 'Farmaal Somali Typewriting Trainer & Games',
        theme_color: '#4f46e5',
        background_color: '#09090b',
        display: 'standalone',
        scope: './',
        start_url: './index.html',
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      }
    })
  ],
  server: {
    watch: {
      ignored: [
        '**/public/Gemini_Generated_Image_*',
        '**/dist-electron/**',
        '**/public/downloads/**'
      ]
    }
  }
})

