import { describe, expect, it } from "vitest";
import { assertEnv, type Bindings } from "../../src/server/env.js";

const base = {
  DB: {} as D1Database,
  APP_ENV: "development",
  GEMINI_MODEL: "gemini-2.5-flash",
  GEMINI_API_KEY: "key",
  GITHUB_CLIENT_ID: "id",
  GITHUB_CLIENT_SECRET: "secret",
  GITHUB_OAUTH_SCOPE: "repo",
  TOKEN_ENCRYPTION_KEY: "k",
  SESSION_SECRET: "s",
  DEFAULT_TIMEZONE: "Asia/Tokyo",
  DEFAULT_DIGEST_HOUR: "21",
} satisfies Bindings;

describe("assertEnv", () => {
  it("passes when all required bindings exist", () => {
    expect(() => assertEnv({ ...base })).not.toThrow();
  });

  it("reports every missing binding at once", () => {
    const { GEMINI_API_KEY: _a, SESSION_SECRET: _b, ...rest } = base;
    expect(() => assertEnv(rest as Bindings)).toThrow(/GEMINI_API_KEY.*SESSION_SECRET/);
  });

  it("does not require a Gemini key in fake mode (offline dev)", () => {
    const { GEMINI_API_KEY: _a, ...rest } = base;
    expect(() => assertEnv({ ...(rest as Bindings), GEMINI_FAKE: "1" })).not.toThrow();
  });

  it("refuses fake mode in production", () => {
    expect(() => assertEnv({ ...base, APP_ENV: "production", GEMINI_FAKE: "1" })).toThrow(
      /production/,
    );
  });
});
