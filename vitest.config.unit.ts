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
    globals: true, // JSDOM for React components, node for backend utils
    environmentMatchGlobs: [
      ["**/__tests__/unit/**/*.test.(ts|tsx)", "jsdom"],
    ],
    setupFiles: ["./__tests__/setup/vitest.setup.ts"],
    include: ["__tests__/unit/**/*.test.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "__tests__/integration/**",
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
    testTimeout: 8000,
  },
});
