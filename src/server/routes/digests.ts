import { Hono } from "hono";
import { digestPath, type Insight, isValidYmd, renderDailyDigest } from "../../core/index.js";
import type { AppEnv } from "../app.js";
import { runDigestForUser, toMemoRecords } from "../jobs/digest.js";
import { createGeminiFor } from "../lib/gemini-factory.js";

export const digestRoutes = new Hono<AppEnv>()
  .get("/:date", async (c) => {
    const date = c.req.param("date");
    if (!isValidYmd(date)) return c.json({ error: "invalid date" }, 400);
    const user = c.get("user");
    const repo = c.get("repo");
    const [digest, rows] = await Promise.all([
      repo.getDigest(user.id, date),
      repo.listMemosByDate(user.id, date),
    ]);
    const memos = toMemoRecords(rows);
    const insight: Insight | null = digest?.insight_json ? JSON.parse(digest.insight_json) : null;
    return c.json(
      {
        date,
        path: user.repo_owner && user.repo_name ? digestPath(user.repo_path_prefix, date) : null,
        digest: digest
          ? {
              status: digest.status,
              commit_sha: digest.commit_sha,
              committed_at: digest.committed_at,
              last_error: digest.last_error,
              insight,
            }
          : null,
        preview: renderDailyDigest({ date, timeZone: user.timezone, memos, insight }),
      },
      200,
    );
  })
  // 「今すぐコミット」。Cron を待たずに手動で日次ファイルを作る。
  .post("/:date/commit", async (c) => {
    const date = c.req.param("date");
    if (!isValidYmd(date)) return c.json({ error: "invalid date" }, 400);
    const deps = c.get("deps");
    const gemini = createGeminiFor(c.env, deps.fetch);
    const outcome = await runDigestForUser(
      { env: c.env, deps, repo: c.get("repo"), gemini },
      c.get("user"),
      date,
    );
    if (outcome.status === "failed") return c.json(outcome, 502);
    return c.json(outcome, 200);
  });
