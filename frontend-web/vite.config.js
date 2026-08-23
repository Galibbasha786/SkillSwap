// frontend-web/vite.config.js

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      // ✅ Helps with simple-peer and WebRTC
      'simple-peer': 'simple-peer/simplepeer.min.js',
      buffer: 'buffer',
    },
  },
  
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'simple-peer', 
      'socket.io-client',
      'buffer'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  
  publicDir: 'public',
  
  build: {
    minify: 'terser',
    sourcemap: false,
    target: 'es2020',  // ✅ Better for WebRTC
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
    port: 5173,
    // COOP allows Razorpay popup; avoid COEP require-corp — it blocks checkout.razorpay.com
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  }
})