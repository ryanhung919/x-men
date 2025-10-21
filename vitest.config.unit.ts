import { defineConfig } from 'vitest/config';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./__tests__/setup/vitest.setup.ts'],
    include: ['__tests__/unit/**/*.test.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '__tests__/unit/components/**', // Exclude component tests from unit config
      '__tests__/integration/**',
      '__tests__/e2e/**',
      "__tests__/unit/supabase/**",
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', '__tests__/', '*.config.{js,ts}', '.next/', '__tests__/deno/**'],
    },
    testTimeout: 8000,
  },
});
