import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
          icons: ['lucide-react'],
        }
      }
    },
    chunkSizeWarningLimit: 600,
    minify: 'esbuild',
    sourcemap: false
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
});
