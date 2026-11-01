import react from '@vitejs/plugin-react'
import path from 'path/win32'
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