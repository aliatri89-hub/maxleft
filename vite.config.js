import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor: Supabase SDK (postgrest, realtime, storage, auth, gotrue)
          if (id.includes('node_modules/@supabase/') || id.includes('node_modules/@supabase-cache-helpers/')) {
            return 'vendor-supabase';
          }
          // Vendor: Capacitor plugins
          if (id.includes('node_modules/@capacitor/') || id.includes('node_modules/@mediagrid/') || id.includes('node_modules/@capgo/')) {
            return 'vendor-capacitor';
          }
          // Vendor: React core
          if (id.includes('node_modules/react-dom/')) {
            return 'vendor-react-dom';
          }
          // Vendor: html2canvas (celebration videos, heavy)
          if (id.includes('node_modules/html2canvas/')) {
            return 'vendor-html2canvas';
          }
        },
      },
    },
  },
})
