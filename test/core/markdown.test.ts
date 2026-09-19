import { describe, expect, it } from "vitest";
import { renderDailyDigest, renderMemoMarkdown } from "../../src/core/markdown.js";
import { sampleInsight, sampleMemoRecord } from "../fixtures/memo.js";

const rec = sampleMemoRecord();

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
      insight: sampleInsight({ actions: ["3 行で報告する"] }),
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
