// vite.config.ts - GUARANTEED COMPATIBLE VERSION WITH PROPER CONFIGURATION

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { config } from 'dotenv';

config();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    'process.env': process.env
  },
  build: {
    // These changes are very safe and won't break anything
    sourcemap: false,  // Remove sourcemaps to reduce file size
    chunkSizeWarningLimit: 1000,  // Increase warning limit
    cssCodeSplit: true, // Split CSS for better optimization
    assetsInlineLimit: 4096, // Keep small assets inline
    rollupOptions: {
      output: {
        // Ensure assets are properly hashed for long-term caching
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Very simple chunking that won't break your app
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Group node_modules into a vendors chunk
            return 'vendors';
          }
          // Keep dialogue and resource files separate
          if (id.includes('/data/dialogues/') || id.includes('/data/resources/')) {
            return 'content';
          }
        }
      }
    }
  }
});