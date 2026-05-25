import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // '/api/*' proxied with path kept intact (backend serves /api/members etc.)
    // '/chat' and '/session' pass through as-is (Day 1 backend paths, no rewrite)
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/chat': { target: 'http://localhost:8000', changeOrigin: true },
      '/session': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
