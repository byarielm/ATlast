import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "__tests__/**/*.test.ts", // Integration tests
      "src/**/*.test.ts", // Co-located unit tests
    ],
    setupFiles: ["__tests__/setup.ts"],
    testTimeout: 30000, // 30s for API calls
    fileParallelism: false, // Run files sequentially - shared DB sessions
  },
});
