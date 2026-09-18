/**
 * Worker のバインディング。秘密は wrangler secret / .dev.vars、非秘密は wrangler.jsonc の vars。
 * 実行時に `assertEnv` で欠落を早期検知する。
 */
export interface Bindings {
  DB: D1Database;
  ASSETS?: Fetcher;
  APP_ENV: string;
  GEMINI_MODEL: string;
  GEMINI_API_KEY: string;
  GEMINI_BASE_URL?: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_OAUTH_SCOPE: string;
  TOKEN_ENCRYPTION_KEY: string;
  SESSION_SECRET: string;
  DEFAULT_TIMEZONE: string;
  DEFAULT_DIGEST_HOUR: string;
}

/** 外部 I/O を差し替えるための依存。テストではフェイクを渡す。 */
export interface Deps {
  fetch: typeof fetch;
  now: () => Date;
  newId: () => string;
}

export const defaultDeps: Deps = {
  fetch: (input, init) => fetch(input, init),
  now: () => new Date(),
  newId: () => crypto.randomUUID(),
};

const REQUIRED: Array<keyof Bindings> = [
  "DB",
  "GEMINI_API_KEY",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "TOKEN_ENCRYPTION_KEY",
  "SESSION_SECRET",
];

export function assertEnv(env: Bindings): void {
  const missing = REQUIRED.filter((k) => !env[k]);
  if (missing.length) throw new Error(`Missing bindings: ${missing.join(", ")}`);
}

export function envDefaults(env: Bindings) {
  return {
    model: env.GEMINI_MODEL || "gemini-2.5-flash",
    scope: env.GITHUB_OAUTH_SCOPE || "repo",
    timezone: env.DEFAULT_TIMEZONE || "Asia/Tokyo",
    digestHour: Number.parseInt(env.DEFAULT_DIGEST_HOUR || "21", 10),
  };
}
