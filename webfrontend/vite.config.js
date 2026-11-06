import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})
