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
    environment: 'node', // Node environment for integration tests
    setupFiles: ['./__tests__/setup/integration.setup.ts'],
    include: ['__tests__/integration/**/*.test.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '__tests__/unit/**',
      '__tests__/e2e/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        //Base
        'node_modules/',
        '__tests__/',
        '.next/',
        'scripts/',
        'middleware.ts',

        // Config files
        '**/*.config.{js,ts,mjs,cjs}',
        '**/vitest.config.*.{js,ts,mjs,cjs}',
        '**/next-env.d.ts',

        // Not meant for coverage in this testing config
        'lib/sample-data.ts',
        'lib/utils.ts',
        'lib/types/',
        'app/api/health/',
        'app/seed/',
        'app/(dashboard)/',
        'components/',
        'supabase/functions/',

      ],
    },
    testTimeout: 30000, // 30 second timeout for integration tests
    hookTimeout: 120000, // 2 minute timeout for setup/teardown hooks
    // Run tests sequentially to avoid database conflicts and race conditions
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Run all tests in a single process
      },
    },
    // Retry flaky tests once (network issues, etc.)
    retry: 1,
    // Don't bail on first failure - run all tests
    bail: 0,
  },
});
