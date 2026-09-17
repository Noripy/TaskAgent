import { describe, expect, it } from "vitest";
import { renderDailyDigest, renderMemoMarkdown } from "../src/markdown.js";
import { emptyMemo, MemoSchema } from "../src/memo.js";
import { INSIGHT_SYSTEM_PROMPT, MEMOIZE_SYSTEM_PROMPT } from "../src/prompts.js";
import { InsightSchema, parseInsightResponse, parseMemoizeResponse } from "../src/protocol.js";

const comm = {
  said: "あの、資料なんですけど、順番がちょっと…",
  better: "資料の構成を見直したいです。理由は流れが分かりにくいためで、目次案を明日お見せします。",
  vocabulary: [{ word: "所感", usage: "報告の末尾で自分の見立てを添えるとき" }],
  delivery_tip: "結論を最初の 1 文で言い切る",
};

describe("communication (語彙力・伝え方)", () => {
  it("MemoSchema には communication があり、古いメモ（フィールド無し）も既定値で読める", () => {
    const legacy = { ...emptyMemo() } as Record<string, unknown>;
    delete legacy.communication;
    legacy.title = "t";
    legacy.summary = "s";
    const parsed = MemoSchema.parse(legacy);
    expect(parsed.communication).toEqual({
      said: null,
      better: null,
      vocabulary: [],
      delivery_tip: null,
    });
  });

  it("communication を含む LLM 応答を受け入れる", () => {
    const memo = { ...emptyMemo(), title: "t", summary: "s", communication: comm };
    const r = parseMemoizeResponse(JSON.stringify({ status: "ready", questions: [], memo }));
    expect(r.kind).toBe("memo");
    if (r.kind === "memo") expect(r.memo.communication.vocabulary[0]?.word).toBe("所感");
  });

  it("語彙は 3 個まで", () => {
    const memo = {
      ...emptyMemo(),
      title: "t",
      summary: "s",
      communication: { ...comm, vocabulary: Array(4).fill({ word: "w", usage: "u" }) },
    };
    expect(() =>
      parseMemoizeResponse(JSON.stringify({ status: "ready", questions: [], memo })),
    ).toThrow();
  });

  it("Markdown に『伝え方』セクションを描画する", () => {
    const md = renderMemoMarkdown({
      id: "m1",
      createdAtIso: "2026-09-17T09:00:00.000Z",
      memo: { ...emptyMemo(), title: "t", summary: "s", communication: comm },
    });
    expect(md).toContain("**伝え方**");
    expect(md).toContain("言った: あの、資料なんですけど");
    expect(md).toContain("言い換え: 資料の構成を見直したいです");
    expect(md).toContain("- 所感 — 報告の末尾で自分の見立てを添えるとき");
    expect(md).toContain("コツ: 結論を最初の 1 文で言い切る");
  });

  it("communication が空なら『伝え方』セクションを出さない", () => {
    const md = renderMemoMarkdown({
      id: "m1",
      createdAtIso: "2026-09-17T09:00:00.000Z",
      memo: { ...emptyMemo(), title: "t", summary: "s" },
    });
    expect(md).not.toContain("伝え方");
  });

  it("Insight に伝え方のフォーカスとフレーズがあり、古い形式も読める", () => {
    const full = parseInsightResponse(
      JSON.stringify({
        good: ["g"],
        actions: ["a"],
        message: "m",
        communication: { focus: "結論から話す", phrase: "結論からお伝えすると、〜です。" },
      }),
    );
    expect(full.communication.focus).toBe("結論から話す");
    const legacy = InsightSchema.parse({ good: ["g"], actions: ["a"], message: "m" });
    expect(legacy.communication).toEqual({ focus: null, phrase: null });
  });

  it("日次 Markdown に伝え方の改善点を描画する", () => {
    const md = renderDailyDigest({
      date: "2026-09-17",
      timeZone: "Asia/Tokyo",
      memos: [],
      insight: {
        good: ["g"],
        actions: ["a"],
        message: "m",
        communication: { focus: "結論から話す", phrase: "結論からお伝えすると、〜です。" },
      },
    });
    expect(md).toContain("**伝え方の改善点**");
    expect(md).toContain("結論から話す");
    expect(md).toContain("明日使うフレーズ: 「結論からお伝えすると、〜です。」");
  });

  it("プロンプトが語彙・伝え方の観点を含む", () => {
    expect(MEMOIZE_SYSTEM_PROMPT).toContain("語彙");
    expect(MEMOIZE_SYSTEM_PROMPT).toContain("言い換え");
    expect(INSIGHT_SYSTEM_PROMPT).toContain("伝え方");
  });
});
