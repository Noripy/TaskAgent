import { defineConfig } from "vitest/config";

// 純粋ロジック（src/core）と fetch モックの単体テスト。高速なので TDD の内側ループはこちら。
export default defineConfig({
  test: {
    include: ["test/core/**/*.test.ts", "test/unit/**/*.test.ts"],
    environment: "node",
  },
});
