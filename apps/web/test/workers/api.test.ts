import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/server/app.js";
import { createRepo } from "../../src/server/db/repo.js";
import { runScheduledDigests } from "../../src/server/jobs/digest.js";
import { createGeminiClient } from "../../src/server/lib/gemini.js";
import { fakeExternal, insightReply, questionReply, readyReply, seedUser } from "./helpers.js";

async function resetDb() {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM daily_digests"),
    env.DB.prepare("DELETE FROM memos"),
    env.DB.prepare("DELETE FROM conversation_turns"),
    env.DB.prepare("DELETE FROM captures"),
    env.DB.prepare("DELETE FROM sessions"),
    env.DB.prepare("DELETE FROM users"),
  ]);
}

describe("API", () => {
  beforeEach(resetDb);

  it("health is public, memos require auth", async () => {
    const app = createApp(fakeExternal().deps);
    expect((await app.request("/api/health", {}, env)).status).toBe(200);
    expect((await app.request("/api/memos", {}, env)).status).toBe(401);
  });

  it("capture → clarification → memo (full rally)", async () => {
    const ext = fakeExternal();
    const app = createApp(ext.deps);
    const { cookie } = await seedUser(ext.deps);
    ext.geminiReplies.push(questionReply("誰からの指摘ですか？", "いつまでですか？"), readyReply());

    const r1 = await app.request(
      "/api/captures",
      {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ text: "資料の順番おかしいって言われた" }),
      },
      env,
    );
    expect(r1.status).toBe(201);
    const j1 = (await r1.json()) as {
      kind: string;
      captureId: string;
      round: number;
      questions: string[];
    };
    expect(j1.kind).toBe("questions");
    expect(j1.round).toBe(1);
    expect(j1.questions).toHaveLength(2);

    const r2 = await app.request(
      `/api/captures/${j1.captureId}/answer`,
      {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ text: "田中さん。金曜まで。" }),
      },
      env,
    );
    expect(r2.status).toBe(200);
    const j2 = (await r2.json()) as { kind: string; memoId: string; memo: { title: string } };
    expect(j2.kind).toBe("memo");
    expect(j2.memo.title).toBe("先輩レビュー");

    // 2 回目の Gemini 呼び出しには履歴が含まれる
    const geminiCalls = ext.calls.filter((c) => c.url.includes("generateContent"));
    expect(geminiCalls).toHaveLength(2);
    const secondBody = geminiCalls[1]?.body as {
      contents: Array<{ parts: Array<{ text: string }> }>;
    };
    const userText = secondBody.contents[0]?.parts[0]?.text ?? "";
    expect(userText).toContain("コーチ: 誰からの指摘ですか？");
    expect(userText).toContain("ユーザー: 田中さん。金曜まで。");

    // 確定後の再回答は 409
    const r3 = await app.request(
      `/api/captures/${j1.captureId}/answer`,
      {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ text: "x" }),
      },
      env,
    );
    expect(r3.status).toBe(409);

    const list = await app.request("/api/memos?date=2026-09-17", { headers: { cookie } }, env);
    const jl = (await list.json()) as { memos: Array<{ id: string }> };
    expect(jl.memos).toHaveLength(1);
    expect(jl.memos[0]?.id).toBe(j2.memoId);
  });

  it("rejects empty capture and invalid llm output", async () => {
    const ext = fakeExternal();
    const app = createApp(ext.deps);
    const { cookie } = await seedUser(ext.deps);
    const bad = await app.request(
      "/api/captures",
      {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ text: "   " }),
      },
      env,
    );
    expect(bad.status).toBe(400);

    ext.geminiReplies.push("not json");
    const r = await app.request(
      "/api/captures",
      {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ text: "x" }),
      },
      env,
    );
    expect(r.status).toBe(500);
    expect(((await r.json()) as { error: string }).error).toContain("JSON");
  });

  it("settings verify repo write permission", async () => {
    const ext = fakeExternal();
    const app = createApp(ext.deps);
    const { cookie } = await seedUser(ext.deps);
    ext.github["GET /repos/tester/notes"] = () =>
      Response.json({ default_branch: "main", permissions: { push: true } });
    const ok = await app.request(
      "/api/settings",
      {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          repo_owner: "tester",
          repo_name: "notes",
          repo_branch: "main",
          repo_path_prefix: "notes",
          timezone: "Asia/Tokyo",
          digest_hour: 22,
        }),
      },
      env,
    );
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as { user: { digest_hour: number } }).user.digest_hour).toBe(22);

    const missing = await app.request(
      "/api/settings",
      {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ repo_owner: "tester", repo_name: "nope" }),
      },
      env,
    );
    expect(missing.status).toBe(422);
  });

  it("manual digest commit renders markdown and calls GitHub", async () => {
    const ext = fakeExternal();
    const app = createApp(ext.deps);
    const { cookie } = await seedUser(ext.deps, { repo_owner: "tester", repo_name: "notes" });
    ext.geminiReplies.push(readyReply(), insightReply());
    ext.github["GET /repos/tester/notes/contents/notes/2026/09/2026-09-17.md"] = () =>
      new Response("{}", { status: 404 });
    let putBody: { content: string; message: string; branch: string } | null = null;
    ext.github["PUT /repos/tester/notes/contents/notes/2026/09/2026-09-17.md"] = ({ body }) => {
      putBody = body as typeof putBody;
      return Response.json(
        { commit: { sha: "c0ffee" }, content: { sha: "b10b" } },
        { status: 201 },
      );
    };

    await app.request(
      "/api/captures",
      {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ text: "x" }),
      },
      env,
    );
    const r = await app.request(
      "/api/digests/2026-09-17/commit",
      { method: "POST", headers: { cookie } },
      env,
    );
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({
      status: "committed",
      commitSha: "c0ffee",
      path: "notes/2026/09/2026-09-17.md",
    });
    const pb = putBody as unknown as { content: string; message: string; branch: string };
    expect(pb.branch).toBe("main");
    expect(pb.message).toBe("notes: 2026-09-17 (1 memos)");
    const md = new TextDecoder().decode(
      Uint8Array.from(atob(pb.content), (ch) => ch.charCodeAt(0)),
    );
    expect(md).toContain("# 2026-09-17 の記録");
    expect(md).toContain("## 今日の振り返り");
    expect(md).toContain("### 先輩レビュー");
    expect(md).toContain("**伝え方**");
    expect(md).toContain("言い換え: 構成を見直します");
    expect(md).toContain("**伝え方の改善点**");
    expect(md).toContain("明日使うフレーズ: 「結論からお伝えすると、〜です。」");

    // 2 回目は変更なしでスキップ（GitHub にも Gemini にも追加リクエストしない）
    const before = ext.calls.length;
    const r2 = await app.request(
      "/api/digests/2026-09-17/commit",
      { method: "POST", headers: { cookie } },
      env,
    );
    expect(await r2.json()).toMatchObject({ status: "skipped", reason: "unchanged" });
    expect(ext.calls.length).toBe(before);

    const status = await app.request("/api/digests/2026-09-17", { headers: { cookie } }, env);
    const js = (await status.json()) as {
      digest: { status: string; commit_sha: string };
      preview: string;
    };
    expect(js.digest.status).toBe("committed");
    expect(js.preview).toContain("70 点で出そう。");
  });

  it("digest failure is recorded and does not throw", async () => {
    const ext = fakeExternal();
    const app = createApp(ext.deps);
    const { cookie } = await seedUser(ext.deps, { repo_owner: "tester", repo_name: "notes" });
    ext.geminiReplies.push(readyReply(), insightReply());
    ext.github["PUT *"] = () => Response.json({ message: "forbidden" }, { status: 403 });
    await app.request(
      "/api/captures",
      {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ text: "x" }),
      },
      env,
    );
    const r = await app.request(
      "/api/digests/2026-09-17/commit",
      { method: "POST", headers: { cookie } },
      env,
    );
    expect(r.status).toBe(502);
    const d = await createRepo(env.DB).getDigest(
      (await createRepo(env.DB).findUserByGithubId(42))!.id,
      "2026-09-17",
    );
    expect(d?.status).toBe("failed");
    expect(d?.last_error).toContain("403");
  });

  it("scheduled job runs only at the user's digest hour", async () => {
    const ext = fakeExternal();
    const app = createApp(ext.deps);
    // deps.now() は 12:00 JST 固定なので digest_hour=12 のユーザーだけ対象
    const { cookie } = await seedUser(ext.deps, {
      repo_owner: "tester",
      repo_name: "notes",
      digest_hour: 12,
    });
    ext.geminiReplies.push(readyReply(), insightReply());
    ext.github["PUT *"] = () => Response.json({ commit: { sha: "s" } }, { status: 201 });
    await app.request(
      "/api/captures",
      {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ text: "x" }),
      },
      env,
    );

    const gemini = createGeminiClient({ apiKey: "k", model: "m", fetchImpl: ext.deps.fetch });
    const results = await runScheduledDigests({
      env,
      deps: ext.deps,
      repo: createRepo(env.DB),
      gemini,
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.outcome.status).toBe("committed");

    // 時刻が合わないユーザーはスキップ
    await createRepo(env.DB).updateUserSettings(
      results[0]!.userId,
      {
        repo_owner: "tester",
        repo_name: "notes",
        repo_branch: "main",
        repo_path_prefix: "notes",
        timezone: "Asia/Tokyo",
        digest_hour: 21,
      },
      "2026-09-17T03:00:00.000Z",
    );
    expect(
      await runScheduledDigests({ env, deps: ext.deps, repo: createRepo(env.DB), gemini }),
    ).toHaveLength(0);
  });
});
