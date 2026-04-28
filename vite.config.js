import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: { port: 5174, strictPort: true },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg', 'maskable-icon.svg'],
      manifest: {
        name: 'Physique',
        short_name: 'Physique',
        description: 'AI Coach personale: peso, pasti, allenamenti.',
        theme_color: '#fef6ec',
        background_color: '#fef6ec',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icon.svg',          sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icon.svg',          sizes: '512x512', type: 'image/svg+xml' },
          { src: '/maskable-icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
          { src: '/icon.svg',          sizes: 'any',     type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
})
