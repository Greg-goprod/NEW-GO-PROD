import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    // Augmenter la limite pour éviter les warnings
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Code splitting manuel pour optimiser le chargement
        manualChunks: {
          // Vendor chunks - bibliothèques qui changent rarement
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': [
            '@dnd-kit/core',
            '@dnd-kit/sortable',
            '@dnd-kit/utilities',
            'lucide-react',
          ],
          'vendor-charts': ['chart.js', 'react-chartjs-2', 'recharts'],
          'vendor-pdf': ['pdf-lib', 'docxtemplater', 'pizzip'],
        },
      },
    },
  },
})
