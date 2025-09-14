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
  // Define default values for missing environment variables
  define: {
    'import.meta.env.VITE_NAV_API_BASE': JSON.stringify(process.env.VITE_NAV_API_BASE || ''),
    'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(process.env.VITE_FIREBASE_API_KEY || ''),
    'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.VITE_FIREBASE_AUTH_DOMAIN || ''),
    'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(process.env.VITE_FIREBASE_PROJECT_ID || ''),
    'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.VITE_FIREBASE_STORAGE_BUCKET || ''),
    'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''),
    'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(process.env.VITE_FIREBASE_APP_ID || ''),
    'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(process.env.VITE_FIREBASE_MEASUREMENT_ID || ''),
    'import.meta.env.VITE_USE_FIREBASE_EMULATOR': JSON.stringify(process.env.VITE_USE_FIREBASE_EMULATOR || 'false'),
    'process': {
      env: {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development')
      }
    }
  }
});
