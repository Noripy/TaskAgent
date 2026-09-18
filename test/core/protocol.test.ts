import { describe, expect, it } from "vitest";
import { emptyMemo } from "../../src/core/memo.js";
import {
  ProtocolError,
  parseInsightResponse,
  parseMemoizeResponse,
} from "../../src/core/protocol.js";

const readyMemo = {
  ...emptyMemo(),
  title: "先輩レビュー",
  summary: "先輩から資料の構成について指摘を受けた",
  facts: ["田中さんが 9/17 に構成の順序を変えるよう言った"],
  keep: ["指摘をその場でメモできた"],
  next_actions: [{ text: "目次案を 3 案書く", minutes: 15, due: null }],
  horenso: { kind: "報告", to: "田中さん", draft: "構成を修正しました。" },
};

describe("parseMemoizeResponse", () => {
  it("returns questions when status=need_clarification", () => {
    const raw = JSON.stringify({
      status: "need_clarification",
      questions: ["誰からの依頼ですか？"],
      memo: null,
    });
    expect(parseMemoizeResponse(raw)).toEqual({
      kind: "questions",
      questions: ["誰からの依頼ですか？"],
    });
  });

  it("returns memo when status=ready", () => {
    const raw = JSON.stringify({ status: "ready", questions: [], memo: readyMemo });
    const r = parseMemoizeResponse(raw);
    expect(r.kind).toBe("memo");
    if (r.kind === "memo") expect(r.memo.title).toBe("先輩レビュー");
  });

  it("accepts fenced json", () => {
    const raw =
      "```json\n" +
      JSON.stringify({ status: "need_clarification", questions: ["いつまで？"] }) +
      "\n```";
    expect(parseMemoizeResponse(raw).kind).toBe("questions");
  });

  it("forceReady rejects questions without memo", () => {
    const raw = JSON.stringify({ status: "need_clarification", questions: ["?"], memo: null });
    expect(() => parseMemoizeResponse(raw, { forceReady: true })).toThrow(ProtocolError);
  });

  it("rejects actions longer than 15 minutes", () => {
    const bad = { ...readyMemo, next_actions: [{ text: "全部やる", minutes: 120, due: null }] };
    const raw = JSON.stringify({ status: "ready", questions: [], memo: bad });
    expect(() => parseMemoizeResponse(raw)).toThrow(ProtocolError);
  });

  it("rejects non-json", () => {
    expect(() => parseMemoizeResponse("hello")).toThrow(ProtocolError);
  });
});

describe("parseInsightResponse", () => {
  it("parses a valid insight", () => {
    const raw = JSON.stringify({
      good: ["相談できた"],
      actions: ["田中さんに 3 行で報告する"],
      message: "70 点で出そう",
    });
    expect(parseInsightResponse(raw).good).toHaveLength(1);
  });
  it("requires at least one good", () => {
    const raw = JSON.stringify({ good: [], actions: ["x"], message: "m" });
    expect(() => parseInsightResponse(raw)).toThrow(ProtocolError);
  });
});
