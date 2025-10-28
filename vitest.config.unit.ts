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
      '__tests__/unit/supabase/**',
      '__tests__/integration/**',
      '__tests__/e2e/**',
      '__tests__/unit/supabase/**',
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
        '**/error.tsx',
        '**/loading.tsx',
        '**/layout.tsx',
        '**/page.tsx',

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
      reportsDirectory: 'coverage/unit',
    },
    testTimeout: 8000,
  },
});
