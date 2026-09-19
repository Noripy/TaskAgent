import {
  type Communication,
  emptyMemo,
  type Insight,
  type Memo,
  type MemoRecord,
} from "../../src/core/index.js";

/**
 * テスト全体で共有するメモの見本。
 *
 * スキーマにフィールドが増えたとき、直す場所をここ 1 つに保つ。
 * （communication を足したときは 4 つのテストファイルを個別に直す羽目になった）
 */
export function sampleMemo(overrides: Partial<Memo> = {}): Memo {
  return {
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
      kind: "報告",
      to: "田中さん",
      draft: "構成を修正しました。\n明日目次案を持っていきます。",
    },
    ...overrides,
  };
}

/** 伝え方（語彙力・言い換え）。既定のメモには載せず、必要なテストだけが明示的に足す。 */
export function sampleCommunication(overrides: Partial<Communication> = {}): Communication {
  return {
    said: "あの、資料なんですけど、順番がちょっと…",
    better:
      "資料の構成を見直したいです。理由は流れが分かりにくいためで、目次案を明日お見せします。",
    vocabulary: [{ word: "所感", usage: "報告の末尾で自分の見立てを添えるとき" }],
    delivery_tip: "結論を最初の 1 文で言い切る",
    ...overrides,
  };
}

export function sampleMemoRecord(overrides: Partial<MemoRecord> = {}): MemoRecord {
  return {
    id: "m1",
    createdAtIso: "2026-09-17T09:00:00.000Z",
    memo: sampleMemo(),
    ...overrides,
  };
}

export function sampleInsight(overrides: Partial<Insight> = {}): Insight {
  return {
    good: ["相談できた"],
    actions: ["田中さんに 3 行で報告する"],
    message: "70 点で出そう。",
    communication: { focus: null, phrase: null },
    ...overrides,
  };
}
