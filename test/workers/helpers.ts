import { env } from "cloudflare:test";
import { Hono } from "hono";
import { vi } from "vitest";
import { createApp } from "../../src/server/app.js";
import { createRepo } from "../../src/server/db/repo.js";
import type { Deps } from "../../src/server/env.js";
import { encryptString } from "../../src/server/lib/crypto.js";
import { setSessionCookie } from "../../src/server/lib/session.js";
import { sampleCommunication, sampleInsight, sampleMemo } from "../fixtures/memo.js";

/** テスト用の GitHub ユーザー ID（seedUser とアサーションで共有する）。 */
export const TEST_GITHUB_ID = 42;

type App = ReturnType<typeof createApp>;
type SeedOverrides = Partial<{
  repo_owner: string;
  repo_name: string;
  timezone: string;
  digest_hour: number;
}>;

/** 外部 API のフェイク。URL でルーティングして応答を返す。 */
export function fakeExternal() {
  const geminiReplies: string[] = [];
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const github: Record<string, (c: { method: string; body: unknown }) => Response> = {};

  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ url, method, body });
    if (url.includes("generateContent")) {
      const reply = geminiReplies.shift();
      if (reply === undefined) return new Response("no scripted reply", { status: 500 });
      return Response.json({ candidates: [{ content: { parts: [{ text: reply }] } }] });
    }
    if (url.startsWith("https://api.github.com")) {
      const key = `${method} ${new URL(url).pathname}`;
      const handler = github[key] ?? github[`${method} *`];
      if (handler) return handler({ method, body });
      return new Response(JSON.stringify({ message: "Not Found" }), { status: 404 });
    }
    return new Response("unexpected", { status: 599 });
  }) as unknown as typeof fetch;

  let tick = 0;
  const deps: Deps = {
    fetch: fetchImpl,
    now: () => new Date(Date.UTC(2026, 8, 17, 3, 0, tick++)), // 2026-09-17 12:00 JST 付近
    newId: () => `id-${String(tick++).padStart(4, "0")}`,
  };
  return { deps, geminiReplies, calls, github };
}

/**
 * HTTP の定型（Cookie・content-type・env の受け渡し）を隠す薄いクライアント。
 * テスト本体には「何を叩いて何を期待するか」だけが残るようにする。
 */
export function apiClient(app: App, cookie?: string) {
  const headers = (json: boolean) => ({
    ...(cookie ? { cookie } : {}),
    ...(json ? { "content-type": "application/json" } : {}),
  });
  const send = (path: string, method: string, body?: unknown) =>
    app.request(
      path,
      {
        method,
        headers: headers(body !== undefined),
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      },
      env,
    );
  return {
    get: (path: string) => app.request(path, { headers: headers(false) }, env),
    post: (path: string, body?: unknown) => send(path, "POST", body),
    put: (path: string, body: unknown) => send(path, "PUT", body),
  };
}

/** よく使う組み立て（フェイク外部 API + アプリ + ログイン済みユーザー）を 1 行にする。 */
export async function setupApi(overrides: SeedOverrides = {}) {
  const ext = fakeExternal();
  const app = createApp(ext.deps);
  const { user, cookie } = await seedUser(ext.deps, overrides);
  return { ext, app, user, cookie, api: apiClient(app, cookie) };
}

export async function seedUser(deps: Deps, overrides: SeedOverrides = {}) {
  const repo = createRepo(env.DB);
  const now = deps.now().toISOString();
  const user = await repo.upsertUserFromGithub({
    id: deps.newId(),
    github_id: TEST_GITHUB_ID,
    login: "tester",
    avatar_url: null,
    encrypted_token: await encryptString("gho_test", env.TOKEN_ENCRYPTION_KEY),
    timezone: overrides.timezone ?? "Asia/Tokyo",
    digest_hour: overrides.digest_hour ?? 21,
    now,
  });
  if (overrides.repo_owner && overrides.repo_name) {
    await repo.updateUserSettings(
      user.id,
      {
        repo_owner: overrides.repo_owner,
        repo_name: overrides.repo_name,
        repo_branch: "main",
        repo_path_prefix: "notes",
        timezone: user.timezone,
        digest_hour: user.digest_hour,
      },
      now,
    );
  }
  const sid = deps.newId();
  await repo.createSession(sid, user.id, "2099-01-01T00:00:00.000Z", now);
  // 署名付き Cookie を Hono のヘルパーで生成する
  const tmp = new Hono();
  tmp.get("/", async (c) => {
    await setSessionCookie(c, env.SESSION_SECRET, sid);
    return c.text("ok");
  });
  const res = await tmp.request("http://localhost/");
  const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
  const stored = await repo.findUserByGithubId(TEST_GITHUB_ID);
  if (!stored) throw new Error("seedUser: ユーザーを読み戻せませんでした");
  return { user: stored, cookie };
}

// --- Gemini のスクリプト応答（中身は test/fixtures/memo.ts と共有する） ---

export const readyReply = (title = "先輩レビュー") =>
  JSON.stringify({
    status: "ready",
    questions: [],
    memo: sampleMemo({ title, communication: sampleCommunication() }),
  });

export const questionReply = (...questions: string[]) =>
  JSON.stringify({ status: "need_clarification", questions, memo: null });

export const insightReply = () =>
  JSON.stringify(
    sampleInsight({
      communication: { focus: "結論から話す", phrase: "結論からお伝えすると、〜です。" },
    }),
  );
