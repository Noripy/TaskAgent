import { z } from "zod";
import { MemoSchema } from "./memo.js";

/**
 * Gemini とのやり取りのプロトコル。
 *
 * - `need_clarification`: 情報が足りない。質問を返す（最大 MAX_CLARIFICATION_ROUNDS 回）。
 * - `ready`: メモ化完了。
 *
 * Gemini の JSON スキーマ機能は oneOf を扱えないため、フラットな 1 スキーマにして
 * status で分岐する。memo は ready のときだけ検証する。
 */
export const MAX_CLARIFICATION_ROUNDS = 3;
export const MAX_QUESTIONS_PER_ROUND = 2;

export const MemoizeResponseSchema = z.object({
  status: z.enum(["need_clarification", "ready"]),
  questions: z.array(z.string().min(1).max(200)).max(MAX_QUESTIONS_PER_ROUND).default([]),
  memo: MemoSchema.nullable().default(null),
});
export type MemoizeResponse = z.infer<typeof MemoizeResponseSchema>;

export type ParsedMemoize =
  | { kind: "questions"; questions: string[] }
  | { kind: "memo"; memo: z.infer<typeof MemoSchema> };

export class ProtocolError extends Error {
  override readonly name = "ProtocolError";
}

/**
 * LLM の生テキスト（JSON）を検証し、アプリが扱える形へ正規化する。
 * `forceReady` は最終ラウンドで質問を許さないとき true。
 */
export function parseMemoizeResponse(
  raw: string,
  opts: { forceReady?: boolean } = {},
): ParsedMemoize {
  let json: unknown;
  try {
    json = JSON.parse(stripCodeFence(raw));
  } catch {
    throw new ProtocolError("LLM の応答が JSON ではありません");
  }
  const parsed = MemoizeResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new ProtocolError(
      `LLM の応答がスキーマに合いません: ${parsed.error.issues[0]?.message ?? ""}`,
    );
  }
  const { status, questions, memo } = parsed.data;
  if (status === "ready" || opts.forceReady) {
    if (!memo) throw new ProtocolError("status=ready なのに memo がありません");
    return { kind: "memo", memo };
  }
  if (questions.length === 0) {
    throw new ProtocolError("need_clarification なのに質問がありません");
  }
  return { kind: "questions", questions };
}

export const InsightSchema = z.object({
  /** 今日の良かったこと。ユーザー本人の行動を主語にする。 */
  good: z.array(z.string().min(1).max(200)).min(1).max(3),
  /** 明日やるべき行動。15 分以内の粒度。 */
  actions: z.array(z.string().min(1).max(200)).min(1).max(3),
  /** ひとことメッセージ（完璧主義を緩める）。 */
  message: z.string().min(1).max(200),
  /** 伝え方の改善点（1 つ）と、明日使うフレーズ（1 つ）。 */
  communication: z
    .object({
      focus: z.string().max(200).nullable().default(null),
      phrase: z.string().max(200).nullable().default(null),
    })
    .default(() => ({ focus: null, phrase: null })),
});
export type Insight = z.infer<typeof InsightSchema>;

export function parseInsightResponse(raw: string): Insight {
  let json: unknown;
  try {
    json = JSON.parse(stripCodeFence(raw));
  } catch {
    throw new ProtocolError("LLM の応答が JSON ではありません");
  }
  const parsed = InsightSchema.safeParse(json);
  if (!parsed.success) {
    throw new ProtocolError(
      `Insight がスキーマに合いません: ${parsed.error.issues[0]?.message ?? ""}`,
    );
  }
  return parsed.data;
}

function stripCodeFence(s: string): string {
  const t = s.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(t);
  return m?.[1] ?? t;
}

/**
 * Gemini `responseSchema` 用（OpenAPI 3.0 サブセット）。
 * zod から自動変換すると nullable/oneOf で崩れるので手書きで固定する。
 */
export const MEMOIZE_RESPONSE_JSON_SCHEMA = {
  type: "OBJECT",
  properties: {
    status: { type: "STRING", enum: ["need_clarification", "ready"] },
    questions: { type: "ARRAY", items: { type: "STRING" } },
    memo: {
      type: "OBJECT",
      nullable: true,
      properties: {
        title: { type: "STRING" },
        summary: { type: "STRING" },
        facts: { type: "ARRAY", items: { type: "STRING" } },
        keep: { type: "ARRAY", items: { type: "STRING" } },
        try: { type: "ARRAY", items: { type: "STRING" } },
        next_actions: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              text: { type: "STRING" },
              minutes: { type: "INTEGER" },
              due: { type: "STRING", nullable: true },
            },
            required: ["text", "minutes"],
          },
        },
        people: { type: "ARRAY", items: { type: "STRING" } },
        tags: { type: "ARRAY", items: { type: "STRING" } },
        horenso: {
          type: "OBJECT",
          properties: {
            kind: { type: "STRING", enum: ["報告", "連絡", "相談", "なし"] },
            to: { type: "STRING", nullable: true },
            draft: { type: "STRING", nullable: true },
          },
          required: ["kind"],
        },
      },
      required: [
        "title",
        "summary",
        "facts",
        "keep",
        "try",
        "next_actions",
        "people",
        "tags",
        "horenso",
      ],
    },
  },
  required: ["status", "questions"],
} as const;

export const INSIGHT_RESPONSE_JSON_SCHEMA = {
  type: "OBJECT",
  properties: {
    good: { type: "ARRAY", items: { type: "STRING" } },
    actions: { type: "ARRAY", items: { type: "STRING" } },
    message: { type: "STRING" },
    communication: {
      type: "OBJECT",
      properties: {
        focus: { type: "STRING", nullable: true },
        phrase: { type: "STRING", nullable: true },
      },
    },
  },
  required: ["good", "actions", "message", "communication"],
} as const;
