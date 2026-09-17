import { env } from "cloudflare:test";
import { emptyMemo } from "@taskagent/core";
import { vi } from "vitest";
import { createRepo } from "../../src/server/db/repo.js";
import type { Deps } from "../../src/server/env.js";
import { encryptString } from "../../src/server/lib/crypto.js";
import { setSessionCookie } from "../../src/server/lib/session.js";

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

export async function seedUser(
  deps: Deps,
  overrides: Partial<{
    repo_owner: string;
    repo_name: string;
    timezone: string;
    digest_hour: number;
  }> = {},
) {
  const repo = createRepo(env.DB);
  const now = deps.now().toISOString();
  const user = await repo.upsertUserFromGithub({
    id: deps.newId(),
    github_id: 42,
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
  const { Hono } = await import("hono");
  const tmp = new Hono();
  tmp.get("/", async (c) => {
    await setSessionCookie(c, env.SESSION_SECRET, sid);
    return c.text("ok");
  });
  const res = await tmp.request("http://localhost/");
  const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
  return { user: (await repo.findUserById(user.id))!, cookie };
}

export function readyReply(title = "先輩レビュー") {
  return JSON.stringify({
    status: "ready",
    questions: [],
    memo: {
      ...emptyMemo(),
      title,
      summary: "資料の構成について指摘を受けた。",
      facts: ["田中さんが構成順を変えるよう言った"],
      keep: ["指摘をその場でメモできた"],
      try: ["先に目次を見せる"],
      next_actions: [{ text: "目次案を 3 案書く", minutes: 15, due: null }],
      people: ["田中さん"],
      tags: ["資料"],
      horenso: { kind: "報告", to: "田中さん", draft: "構成を修正しました。" },
      communication: {
        said: "あの、順番がちょっと…",
        better: "構成を見直します。理由は流れが分かりにくいためです。目次案を明日お見せします。",
        vocabulary: [{ word: "所感", usage: "報告の末尾で自分の見立てを添えるとき" }],
        delivery_tip: "結論を最初の 1 文で言い切る",
      },
    },
  });
}

export function questionReply(...qs: string[]) {
  return JSON.stringify({ status: "need_clarification", questions: qs, memo: null });
}

export function insightReply() {
  return JSON.stringify({
    good: ["相談できた"],
    actions: ["田中さんに 3 行で報告する"],
    message: "70 点で出そう。",
    communication: { focus: "結論から話す", phrase: "結論からお伝えすると、〜です。" },
  });
}
