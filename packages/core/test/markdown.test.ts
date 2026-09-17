import { describe, expect, it } from "vitest";
import { renderDailyDigest, renderMemoMarkdown } from "../src/markdown.js";
import { emptyMemo } from "../src/memo.js";

const rec = {
  id: "m1",
  createdAtIso: "2026-09-17T09:00:00.000Z",
  memo: {
    ...emptyMemo(),
    title: "先輩レビュー",
    summary: "資料構成の指摘を受けた。",
    facts: ["田中さんが構成順を変えるよう言った"],
    keep: ["その場でメモできた"],
    try: ["先に目次を見せる"],
    next_actions: [{ text: "目次案を 3 案書く", minutes: 15, due: "2026-09-18" }],
    people: ["田中さん"],
    tags: ["資料"],
    horenso: {
      kind: "報告" as const,
      to: "田中さん",
      draft: "構成を修正しました。\n明日目次案を持っていきます。",
    },
  },
};

describe("renderMemoMarkdown", () => {
  it("is deterministic and includes all sections", () => {
    const md = renderMemoMarkdown(rec);
    expect(md).toBe(renderMemoMarkdown(rec));
    expect(md).toMatchInlineSnapshot(`
      "### 先輩レビュー

      <!-- memo:m1 2026-09-17T09:00:00.000Z -->

      資料構成の指摘を受けた。

      **事実**

      - 田中さんが構成順を変えるよう言った

      **良かったこと (Keep)**

      - その場でメモできた

      **次に試すこと (Try)**

      - 先に目次を見せる

      **最初の一歩 (15 分以内)**

      - [ ] 目次案を 3 案書く (15分, 2026-09-18 まで)

      **報告 → 田中さん**

      > 構成を修正しました。
      > 明日目次案を持っていきます。

      _関係者: 田中さん_  _タグ: #資料_"
    `);
  });
});

describe("renderDailyDigest", () => {
  it("renders frontmatter, insight and memos sorted by time", () => {
    const later = { ...rec, id: "m2", createdAtIso: "2026-09-17T10:00:00.000Z" };
    const md = renderDailyDigest({
      date: "2026-09-17",
      timeZone: "Asia/Tokyo",
      memos: [later, rec],
      insight: { good: ["相談できた"], actions: ["3 行で報告する"], message: "70 点で出そう。" },
    });
    expect(md.startsWith("---\ndate: 2026-09-17\n")).toBe(true);
    expect(md).toContain("## 今日の振り返り");
    expect(md.indexOf("memo:m1")).toBeLessThan(md.indexOf("memo:m2"));
    expect(md.endsWith("\n")).toBe(true);
  });

  it("handles empty day", () => {
    const md = renderDailyDigest({
      date: "2026-09-17",
      timeZone: "Asia/Tokyo",
      memos: [],
      insight: null,
    });
    expect(md).toContain("_この日のメモはありません。_");
    expect(md).not.toContain("今日の振り返り");
  });
});
