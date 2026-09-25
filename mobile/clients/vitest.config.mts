import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Pure helpers in src/lib only: no React, no native modules, no DOM.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // The market's zone, pinned so date tests read the same locally and on
    // UTC CI runners.
    env: { TZ: 'Asia/Kolkata' },
  },
});
