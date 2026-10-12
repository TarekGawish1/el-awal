import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@jest/globals': path.resolve(__dirname, './test/jest-globals-shim.ts'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    swc.vite(),
  ],
});
