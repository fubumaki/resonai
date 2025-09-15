import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.spec.ts'],
    reporters: ['default'],
    coverage: { enabled: false },
    setupFiles: ['tests/unit/setup.ts'],
    globals: true,
    environment: 'jsdom'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
});
