import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    base: process.env.VITE_BASE_PATH || '/',
    server: env.CHAT_PROXY_TARGET
      ? {
          proxy: {
            // Dev-only proxy to avoid CORS when calling the local backend.
            '/lambda': {
              target: env.CHAT_PROXY_TARGET,
              changeOrigin: true,
              rewrite: path => path.replace(/^\/lambda/, ''),
              timeout: 600000,        // 10 minutes (> browser limits of 2 min JSON / 3 min stream)
              proxyTimeout: 600000,
            },
          },
        }
      : undefined,
  };
});
