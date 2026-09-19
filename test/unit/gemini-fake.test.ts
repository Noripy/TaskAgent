import { describe, expect, it } from "vitest";
import {
  buildInsightUserPrompt,
  buildMemoizeUserPrompt,
  INSIGHT_SYSTEM_PROMPT,
  MEMOIZE_SYSTEM_PROMPT,
  parseInsightResponse,
  parseMemoizeResponse,
} from "../../src/core/index.js";
import { createFakeGeminiClient } from "../../src/server/lib/gemini-fake.js";

const memoizeUser = (round: number) =>
  buildMemoizeUserPrompt({
    today: "2026-09-19",
    rawText: "田中さんに資料の順番おかしいと言われた 金曜まで",
    history: [],
    round,
  });

describe("fake Gemini client（オフライン開発用）", () => {
  it("1 ラウンド目は質問を返す", async () => {
    const c = createFakeGeminiClient();
    const parsed = parseMemoizeResponse(
      await c.generateJson({ system: MEMOIZE_SYSTEM_PROMPT, user: memoizeUser(1), schema: {} }),
    );
    expect(parsed.kind).toBe("questions");
    if (parsed.kind === "questions") expect(parsed.questions.length).toBeGreaterThan(0);
  });

  it("2 ラウンド目はスキーマを満たすメモを返す", async () => {
    const c = createFakeGeminiClient();
    const parsed = parseMemoizeResponse(
      await c.generateJson({ system: MEMOIZE_SYSTEM_PROMPT, user: memoizeUser(2), schema: {} }),
    );
    expect(parsed.kind).toBe("memo");
    if (parsed.kind === "memo") {
      expect(parsed.memo.title).toContain("資料");
      expect(parsed.memo.next_actions[0]?.minutes).toBeLessThanOrEqual(15);
      expect(parsed.memo.communication.better).toBeTruthy();
    }
  });

  it("振り返りプロンプトにはインサイトを返す", async () => {
    const c = createFakeGeminiClient();
    const raw = await c.generateJson({
      system: INSIGHT_SYSTEM_PROMPT,
      user: buildInsightUserPrompt({ date: "2026-09-19", memosMarkdown: "### 先輩レビュー" }),
      schema: {},
    });
    const insight = parseInsightResponse(raw);
    expect(insight.good.length).toBeGreaterThan(0);
    expect(insight.actions.length).toBeGreaterThan(0);
  });

  it("同じ入力には同じ出力を返す（決定的）", async () => {
    const c = createFakeGeminiClient();
    const a = await c.generateJson({
      system: MEMOIZE_SYSTEM_PROMPT,
      user: memoizeUser(2),
      schema: {},
    });
    const b = await c.generateJson({
      system: MEMOIZE_SYSTEM_PROMPT,
      user: memoizeUser(2),
      schema: {},
    });
    expect(a).toBe(b);
  });

  it("ネットワークを一切使わない（fetch を渡さなくても動く）", async () => {
    const c = createFakeGeminiClient();
    await expect(
      c.generateJson({ system: MEMOIZE_SYSTEM_PROMPT, user: memoizeUser(3), schema: {} }),
    ).resolves.toBeTypeOf("string");
  });
});
