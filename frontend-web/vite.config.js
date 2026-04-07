import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
