import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/login': { target: 'http://localhost:5134', changeOrigin: true },
      '/register': { target: 'http://localhost:5134', changeOrigin: true },
      '/logout': { target: 'http://localhost:5134', changeOrigin: true },
      '/check_auth': { target: 'http://localhost:5134', changeOrigin: true },
      '/tasks': { target: 'http://localhost:5134', changeOrigin: true },
      '/notes': { target: 'http://localhost:5134', changeOrigin: true },
      '/streak': { target: 'http://localhost:5134', changeOrigin: true },
      '/download-notes': { target: 'http://localhost:5134', changeOrigin: true },
    },
  },
})
