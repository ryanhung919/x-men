import { defineConfig } from 'vitest/config';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./__tests__/setup/vitest.component.setup.ts'],
    include: ['__tests__/unit/components/**/*.test.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '__tests__/integration/**',
      '__tests__/e2e/**',
    ],
    // Increase pool timeout for CI environments
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    // Configure test environment options for better jsdom compatibility
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        url: 'http://localhost:3000',
        pretendToBeVisual: true,
        runScripts: 'dangerously',
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', '__tests__/', '*.config.{js,ts}', '.next/'],
    },
    testTimeout: 10000, 
    hookTimeout: 10000,
    // Retry failed tests once in CI
    retry: process.env.CI ? 1 : 0,
  },
});