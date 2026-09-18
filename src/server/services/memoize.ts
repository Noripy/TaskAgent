import {
  buildMemoizeUserPrompt,
  MAX_CLARIFICATION_ROUNDS,
  MEMOIZE_RESPONSE_JSON_SCHEMA,
  MEMOIZE_SYSTEM_PROMPT,
  type Memo,
  parseMemoizeResponse,
  toLocalDateString,
} from "../../core/index.js";
import type { CaptureRow, Repo } from "../db/repo.js";
import type { Deps } from "../env.js";
import type { GeminiClient } from "../lib/gemini.js";

export type MemoizeResult =
  | { kind: "questions"; captureId: string; round: number; questions: string[] }
  | { kind: "memo"; captureId: string; memoId: string; memo: Memo };

/**
 * 「捨てない → 数回の質問 → 構造化メモ」の 1 ラウンドを進める。
 * 副作用（DB 保存）はここに集約し、ルートは薄く保つ。
 */
export async function startCapture(
  ctx: { repo: Repo; gemini: GeminiClient; deps: Deps; userId: string; timezone: string },
  rawText: string,
): Promise<MemoizeResult> {
  const now = ctx.deps.now();
  const capture: CaptureRow = {
    id: ctx.deps.newId(),
    user_id: ctx.userId,
    raw_text: rawText,
    status: "clarifying",
    round: 0,
    local_date: toLocalDateString(now, ctx.timezone),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
  await ctx.repo.createCapture({ ...capture, now: capture.created_at });
  return advance(ctx, capture);
}

export async function answerCapture(
  ctx: { repo: Repo; gemini: GeminiClient; deps: Deps; userId: string; timezone: string },
  capture: CaptureRow,
  answer: string,
): Promise<MemoizeResult> {
  if (capture.status !== "clarifying") throw new MemoizeStateError("このメモは既に確定しています");
  await ctx.repo.addTurn({
    id: ctx.deps.newId(),
    capture_id: capture.id,
    role: "user",
    content: answer,
    now: ctx.deps.now().toISOString(),
  });
  return advance(ctx, capture);
}

export class MemoizeStateError extends Error {
  override readonly name = "MemoizeStateError";
}

async function advance(
  ctx: { repo: Repo; gemini: GeminiClient; deps: Deps; userId: string; timezone: string },
  capture: CaptureRow,
): Promise<MemoizeResult> {
  const round = capture.round + 1;
  const history = (await ctx.repo.listTurns(capture.id)).map((t) => ({
    role: t.role,
    content: t.content,
  }));
  const today = toLocalDateString(ctx.deps.now(), ctx.timezone);
  const user = buildMemoizeUserPrompt({ today, rawText: capture.raw_text, history, round });
  const raw = await ctx.gemini.generateJson({
    system: MEMOIZE_SYSTEM_PROMPT,
    user,
    schema: MEMOIZE_RESPONSE_JSON_SCHEMA,
  });
  const parsed = parseMemoizeResponse(raw, { forceReady: round >= MAX_CLARIFICATION_ROUNDS });
  const nowIso = ctx.deps.now().toISOString();

  if (parsed.kind === "questions") {
    await ctx.repo.addTurn({
      id: ctx.deps.newId(),
      capture_id: capture.id,
      role: "assistant",
      content: parsed.questions.join("\n"),
      now: nowIso,
    });
    await ctx.repo.updateCapture(capture.id, { status: "clarifying", round }, nowIso);
    return { kind: "questions", captureId: capture.id, round, questions: parsed.questions };
  }

  const memoId = ctx.deps.newId();
  await ctx.repo.createMemo({
    id: memoId,
    user_id: ctx.userId,
    capture_id: capture.id,
    local_date: capture.local_date,
    memo: parsed.memo,
    now: nowIso,
  });
  await ctx.repo.updateCapture(capture.id, { status: "finalized", round }, nowIso);
  return { kind: "memo", captureId: capture.id, memoId, memo: parsed.memo };
}
