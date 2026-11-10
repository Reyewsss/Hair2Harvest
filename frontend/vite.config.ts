import react from '@vitejs/plugin-react'
import path from 'path' // For Windows ('path/win32'); For Mac ('path')
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3001
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src")
    },
  }
})