import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Provide default values for environment variables
  envPrefix: 'VITE_',
  envDir: '.',
  // Only define process.env for Node.js compatibility, let Vite handle VITE_ vars naturally
  define: {
    'process': {
      env: {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development')
      }
    }
  }
});
