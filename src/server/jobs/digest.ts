import {
  buildInsightUserPrompt,
  digestPath,
  INSIGHT_RESPONSE_JSON_SCHEMA,
  INSIGHT_SYSTEM_PROMPT,
  type Insight,
  localHour,
  type MemoRecord,
  MemoSchema,
  memosToPlainMarkdown,
  parseInsightResponse,
  renderDailyDigest,
  toLocalDateString,
} from "../../core/index.js";
import type { Repo, UserRow } from "../db/repo.js";
import type { Bindings, Deps } from "../env.js";
import { decryptString, sha256Hex } from "../lib/crypto.js";
import type { GeminiClient } from "../lib/gemini.js";
import { commitFile } from "../lib/github.js";

export interface DigestContext {
  env: Bindings;
  deps: Deps;
  repo: Repo;
  gemini: GeminiClient;
}

export type DigestOutcome =
  | { status: "skipped"; reason: string }
  | { status: "committed"; commitSha: string; path: string }
  | { status: "failed"; error: string };

export function toMemoRecords(
  rows: Array<{ id: string; created_at: string; memo_json: string }>,
): MemoRecord[] {
  return rows.map((r) => ({
    id: r.id,
    createdAtIso: r.created_at,
    memo: MemoSchema.parse(JSON.parse(r.memo_json)),
  }));
}

/** 1 ユーザー・1 日分をレンダリングして GitHub にコミットする（冪等）。 */
export async function runDigestForUser(
  ctx: DigestContext,
  user: UserRow,
  localDate: string,
): Promise<DigestOutcome> {
  if (!user.repo_owner || !user.repo_name)
    return { status: "skipped", reason: "repo not configured" };
  const rows = await ctx.repo.listMemosByDate(user.id, localDate);
  const existing = await ctx.repo.getDigest(user.id, localDate);
  if (rows.length === 0) return { status: "skipped", reason: "no memos" };

  const nowIso = ctx.deps.now().toISOString();
  const memos = toMemoRecords(rows);

  // インサイトは既存があれば再利用（LLM 呼び出しを節約）。メモが増えた日は作り直す。
  let insight: Insight | null = null;
  const memosMd = memosToPlainMarkdown(memos);
  const memosHash = await sha256Hex(memosMd);
  try {
    if (existing?.insight_json && existing.content_hash?.startsWith(`${memosHash}:`)) {
      insight = parseInsightResponse(existing.insight_json);
    } else {
      const raw = await ctx.gemini.generateJson({
        system: INSIGHT_SYSTEM_PROMPT,
        user: buildInsightUserPrompt({ date: localDate, memosMarkdown: memosMd }),
        schema: INSIGHT_RESPONSE_JSON_SCHEMA,
      });
      insight = parseInsightResponse(raw);
    }
  } catch (e) {
    // インサイト失敗はコミットを止めない（メモの保全が最優先）
    insight = null;
    console.warn(
      "insight generation failed",
      user.id,
      localDate,
      e instanceof Error ? e.message : e,
    );
  }

  const content = renderDailyDigest({ date: localDate, timeZone: user.timezone, memos, insight });
  const contentHash = `${memosHash}:${await sha256Hex(content)}`;
  if (existing?.status === "committed" && existing.content_hash === contentHash) {
    return { status: "skipped", reason: "unchanged" };
  }

  const path = digestPath(user.repo_path_prefix, localDate);
  try {
    const token = await decryptString(user.encrypted_token, ctx.env.TOKEN_ENCRYPTION_KEY);
    const { commitSha } = await commitFile({
      token,
      owner: user.repo_owner,
      repo: user.repo_name,
      branch: user.repo_branch,
      path,
      content,
      message: `notes: ${localDate} (${memos.length} memos)`,
      fetchImpl: ctx.deps.fetch,
    });
    await ctx.repo.upsertDigest({
      id: existing?.id ?? ctx.deps.newId(),
      user_id: user.id,
      local_date: localDate,
      insight,
      content_hash: contentHash,
      commit_sha: commitSha,
      repo_path: path,
      status: "committed",
      last_error: null,
      committed_at: nowIso,
      now: nowIso,
    });
    return { status: "committed", commitSha, path };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await ctx.repo.upsertDigest({
      id: existing?.id ?? ctx.deps.newId(),
      user_id: user.id,
      local_date: localDate,
      insight,
      content_hash: null,
      commit_sha: null,
      repo_path: path,
      status: "failed",
      last_error: msg.slice(0, 500),
      committed_at: null,
      now: nowIso,
    });
    return { status: "failed", error: msg };
  }
}

/**
 * Cron（毎時）から呼ばれる。各ユーザーの現地時刻が digest_hour のときだけ当日分をコミットし、
 * 失敗済みの過去分も少数リトライする。
 */
export async function runScheduledDigests(
  ctx: DigestContext,
): Promise<Array<{ userId: string; date: string; outcome: DigestOutcome }>> {
  const now = ctx.deps.now();
  const users = await ctx.repo.listUsersWithRepo();
  const results: Array<{ userId: string; date: string; outcome: DigestOutcome }> = [];
  for (const user of users) {
    if (localHour(now, user.timezone) !== user.digest_hour) continue;
    const today = toLocalDateString(now, user.timezone);
    results.push({
      userId: user.id,
      date: today,
      outcome: await runDigestForUser(ctx, user, today),
    });
    for (const failed of await ctx.repo.listFailedDigests(user.id)) {
      if (failed.local_date === today) continue;
      results.push({
        userId: user.id,
        date: failed.local_date,
        outcome: await runDigestForUser(ctx, user, failed.local_date),
      });
    }
  }
  return results;
}
