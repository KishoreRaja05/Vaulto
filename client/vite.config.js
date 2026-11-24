import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Register the service worker in `npm run dev` too, so Edge can offer install.
      devOptions: { enabled: true, type: 'module' },
      manifest: {
        name: 'Vaulto — Personal Finance Tracker',
        short_name: 'Vaulto',
        description: 'Track spending, get insights, and chat with your finances.',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/dashboard',
        scope: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // The app bundle is slightly over Workbox's 2 MB default; keep the
        // shell precached so standalone launches work offline.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            // Financial data and chats must always hit the network, never cache.
            urlPattern: /^https:\/\/vaulto-backend-rrap\.onrender\.com\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
