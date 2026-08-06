import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/temp-next-app/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
