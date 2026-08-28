import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:18080',
        rewrite: (path) => path.replace(/^\/api/, ''),
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor-react';
          if (id.includes('src/landing/LandingPage')) return 'landing';
          if (id.includes('src/admin/AdminConsole')) return 'admin';
          if (id.includes('src/app/user/UserDashboard')) return 'app-user';
          if (id.includes('src/app/org/OrgDashboard')) return 'app-org';
          if (id.includes('src/auth/AuthPage')) return 'auth';
          return undefined;
        },
      },
    },
  },
})
