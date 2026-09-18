import { describe, expect, it } from "vitest";
import { buildMemoizeUserPrompt, MEMOIZE_SYSTEM_PROMPT } from "../../src/core/prompts.js";

describe("prompts", () => {
  it("system prompt is stable (cache-friendly) and mentions constraints", () => {
    expect(MEMOIZE_SYSTEM_PROMPT).toContain("15 分");
    expect(MEMOIZE_SYSTEM_PROMPT).toContain("最大 2 個");
  });
  it("final round forces ready", () => {
    const p = buildMemoizeUserPrompt({ today: "2026-09-17", rawText: "x", history: [], round: 3 });
    expect(p).toContain("最終ラウンド");
  });
  it("includes history", () => {
    const p = buildMemoizeUserPrompt({
      today: "2026-09-17",
      rawText: "x",
      history: [
        { role: "assistant", content: "誰から？" },
        { role: "user", content: "田中さん" },
      ],
      round: 2,
    });
    expect(p).toContain("コーチ: 誰から？");
    expect(p).toContain("ユーザー: 田中さん");
  });
});
