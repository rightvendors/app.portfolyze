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
  },
  // Proxy configuration to bypass CORS
  server: {
    proxy: {
      '/api/nav': {
        target: process.env.VITE_NAV_API_BASE || 'https://script.google.com/macros/s/AKfycbxWBjnlhuy6vEGBdgcSeFdiGdofUiPJuT5B8w-m_J9NXFDrdci6TuD55cf_RdfTsmPt/exec',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nav/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Add CORS headers
            proxyReq.setHeader('Access-Control-Allow-Origin', '*');
            proxyReq.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            proxyReq.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Add CORS headers to response
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
          });
        }
      }
    }
  }
});
