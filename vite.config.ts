/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The Go API is reached through same-origin paths (/v1, /zatca, /pdfs, ...)
// exactly like the legacy CRA proxy, so production nginx config stays unchanged.
const API_PATHS = ['/v1', '/zatca', '/pdfs', '/images', '/attachments', '/cdn', '/socket.io'];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_PROXY_HOST || env.REACT_APP_PROXY_HOST || 'http://127.0.0.1:2000';
  const proxy = Object.fromEntries(
    API_PATHS.map((p) => [p, { target, changeOrigin: true, ws: p === '/v1' }]),
  );
  return {
    plugins: [react()],
    resolve: { alias: { '@': '/src' } },
    server: { port: 3004, host: true, proxy },
    preview: { port: 4173, host: true, proxy },
    build: { outDir: 'build', sourcemap: false, chunkSizeWarningLimit: 900 },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
      restoreMocks: true,
      testTimeout: 20000,
    },
  };
});
