import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // By default Vitest spawns one worker fork per CPU core. On machines with many
    // cores / limited RAM (notably Windows) that exhausts committable memory during
    // worker startup and crashes with "JavaScript heap out of memory" + "spawn UNKNOWN"
    // before any test runs. Cap concurrency to a couple of forks so the spawn storm
    // can't exhaust memory. We deliberately do NOT use singleFork: it collapses every
    // file into one process and breaks per-file isolation (leaked DOM/module state).
    pool: 'forks',
    poolOptions: {
      forks: {
        minForks: 1,
        maxForks: 2,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
