import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'SkillSwap',
        short_name: 'SkillSwap',
        description: 'Learn and earn by sharing skills with others',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/icon-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: '/icons/screenshot-1.png',
            sizes: '540x720',
            type: 'image/png',
            form_factor: 'narrow'
          },
          {
            src: '/icons/screenshot-2.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide'
          }
        ],
        categories: ['education', 'productivity'],
        shortcuts: [
          {
            name: 'Marketplace',
            short_name: 'Shop',
            description: 'Browse skills in the marketplace',
            url: '/marketplace',
            icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'My Matches',
            short_name: 'Matches',
            description: 'View your skill matches',
            url: '/matches',
            icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.skillswap\..*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60
              }
            }
          },
          {
            urlPattern: /^https:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  publicDir: 'public',
  build: {
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('@mui') || id.includes('react')) {
              return 'vendor';
            }
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    host: true,
    port: 5173
  }
})
