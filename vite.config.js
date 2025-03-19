import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { compression } from 'vite-plugin-compression2'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    compression() // Compression gzip des assets
  ],
  build: {
    target: 'es2015', // Meilleur support navigateur
    minify: 'terser', // Minification plus agressive
    cssMinify: true, // Minification CSS
    rollupOptions: {
      output: {
        manualChunks: {
          // Séparer les vendors du code applicatif
          vendor: ['react', 'react-dom', '@zxing/library'],
          // Séparer les icônes
          icons: ['@fortawesome/react-fontawesome', '@fortawesome/free-solid-svg-icons']
        }
      }
    },
    chunkSizeWarningLimit: 1000 // Augmenter la limite d'avertissement de taille
  },
  server: {
    host: true,
    port: 4000,
  }
})
