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
    environment: 'happy-dom',
    setupFiles: ['./__tests__/setup/vitest.component.setup.ts'],
    include: ['__tests__/unit/components/**/*.test.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '__tests__/integration/**',
      '__tests__/e2e/**',
    ],
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
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
        'lib/',
        'app/api/',
        'app/seed/',
        'supabase/functions/',
        'components/ui',
      ],
      reportsDirectory: 'coverage/component',
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
