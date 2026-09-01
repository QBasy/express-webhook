/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendTarget = process.env.VITE_BACKEND_URL || 'http://localhost:6005';

// Прокси /auth, /admin, /room, /hook, /health на бэкенд в dev-режиме —
// в проде тот же путь проксирует nginx (см. ../nginx.conf), запросы
// с фронта всегда идут относительными путями, без хардкода origin.
const apiProxyPrefixes = ['/auth', '/admin', '/room', '/hook', '/health'];

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(
      apiProxyPrefixes.map((prefix) => [prefix, { target: backendTarget, changeOrigin: true }])
    ),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
