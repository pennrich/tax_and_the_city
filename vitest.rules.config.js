import { defineConfig } from "vitest/config";

// 보안 규칙 테스트: firebase 에뮬레이터 안에서만 돈다 (npm run test:rules).
export default defineConfig({
  test: {
    include: ["tests/rules/*.test.js"],
    environment: "node",
    testTimeout: 20000,
    fileParallelism: false,
  },
});
