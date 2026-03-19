import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  base: '/',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Proxies LLM para evitar errores CORS en el browser
      '/proxy/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/openai/, ''),
      },
      '/proxy/ollama': {
        target: 'https://ollama.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/ollama/, ''),
      },
      '/proxy/deepseek': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/deepseek/, ''),
      },
    },
  }
})
