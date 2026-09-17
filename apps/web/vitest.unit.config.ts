import { defineConfig } from "vitest/config";

// 純粋ロジック（fetch モック）。高速なので TDD の内側ループはこちら。
export default defineConfig({
  test: {
    include: ["test/unit/**/*.test.ts"],
    environment: "node",
  },
});
