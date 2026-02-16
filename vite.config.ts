import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // In productie wordt via Nginx vanaf root (/) geserveerd. Gebruik '/' als default.
  // Maak overschrijven mogelijk met VITE_BASE indien nodig (bijv. GitLab Pages).
  base: process.env.VITE_BASE || '/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  preview: {
    host: true,
    port: 3000,
    strictPort: true,
    allowedHosts: true,
  },
  server: {
    host: true,
    port: 5173,
  },
});
