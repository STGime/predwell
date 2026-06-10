import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Predwell — Berlin renter intelligence',
        short_name: 'Predwell',
        description:
          'Find your Berlin apartment before it is listed. Predictive apartment search with early alerts.',
        theme_color: '#20382a',
        background_color: '#f7f2e9',
        display: 'standalone',
        start_url: '/',
        lang: 'en',
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // App shell only; API calls always go to the network.
        globPatterns: ['**/*.{js,css,html,svg}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  server: {
    port: 3000,
  },
})
