import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const serveItemDetailPage = (req) => (
  req.method === 'GET' && /^\/(?:tasks|notes)\/[^/]+\/?$/.test(req.url || '') ? req.url : undefined
)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/login': { target: 'http://localhost:5134', changeOrigin: true },
      '/register': { target: 'http://localhost:5134', changeOrigin: true },
      '/logout': { target: 'http://localhost:5134', changeOrigin: true },
      '/check_auth': { target: 'http://localhost:5134', changeOrigin: true },
      '/tasks': {
        target: 'http://localhost:5134',
        changeOrigin: true,
        bypass: serveItemDetailPage,
      },
      '/notes': {
        target: 'http://localhost:5134',
        changeOrigin: true,
        bypass: serveItemDetailPage,
      },
      '/streak': { target: 'http://localhost:5134', changeOrigin: true },
      '/download-notes': { target: 'http://localhost:5134', changeOrigin: true },
    },
  },
})
