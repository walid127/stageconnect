import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: isProduction
        ? {}
        : {
            '/api': {
              target: 'http://localhost:8000', // local backend for dev
              changeOrigin: true,
              secure: false,
              rewrite: (path) => path,
            },
          },
    },
  };
});