import { join } from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

// workerd 上で D1 を含めて動かす結合テスト。外部 API はフェイクを注入する。
export default defineConfig(async () => {
  const migrations = await readD1Migrations(join(import.meta.dirname, "migrations"));
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            GITHUB_CLIENT_ID: "test-client",
            GITHUB_CLIENT_SECRET: "test-secret",
            GEMINI_API_KEY: "test-gemini",
            TOKEN_ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            SESSION_SECRET: "test-session-secret-0123456789",
            APP_ENV: "test",
          },
        },
      }),
    ],
    test: {
      include: ["test/workers/**/*.test.ts"],
      setupFiles: ["./test/workers/setup.ts"],
    },
  };
});
