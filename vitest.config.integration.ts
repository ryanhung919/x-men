import { defineConfig } from "vitest/config";
import path from "path";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./__tests__/setup/integration.setup.ts"],
    include: ["__tests__/integration/**/*.test.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "__tests__/unit/**",
      "__tests__/e2e/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "__tests__/",
        "*.config.{js,ts}",
        ".next/",
      ],
    },
    testTimeout: 30000, // Increased timeout for real DB operations
    hookTimeout: 60000, // Increased timeout for setup/teardown
    // Run tests sequentially to avoid DB conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});