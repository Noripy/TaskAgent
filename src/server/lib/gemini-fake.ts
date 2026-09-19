import { emptyMemo, type Insight, MAX_ACTION_MINUTES, type Memo } from "../../core/index.js";
import type { GeminiClient } from "./gemini.js";

/**
 * ネットワークを使わないフェイクの Gemini クライアント。
 *
 * 目的は Docker だけで開発ループを閉じること。API キーがなくても、オフラインでも、
 * 無料枠を消費せずに「投げる → 質問 → メモ → 振り返り」を一通り動かせる。
 * `.dev.vars` に GEMINI_FAKE=1 を入れると有効になる（production では `assertEnv` が拒否する）。
 *
 * 出力は本物と同じ JSON プロトコルに従い、決定的（同じ入力 → 同じ出力）。
 */
export function createFakeGeminiClient(): GeminiClient {
  return {
    async generateJson({ system, user }) {
      if (user.startsWith("対象日:") || system.includes("振り返りコーチ")) {
        return JSON.stringify(buildInsight());
      }
      if (!/ラウンド:/.test(user)) {
        throw new Error(
          "fake Gemini: 未知のプロンプト形式です（src/core/prompts.ts と揃えてください）",
        );
      }
      if (readRound(user) <= 1) {
        return JSON.stringify({
          status: "need_clarification",
          questions: ["これは誰からの依頼ですか？", "いつまでに終わらせる必要がありますか？"],
          memo: null,
        });
      }
      return JSON.stringify({ status: "ready", questions: [], memo: buildMemo(readRawText(user)) });
    },
  };
}

function readRound(user: string): number {
  const m = /ラウンド:\s*(\d+)/.exec(user);
  return m?.[1] ? Number.parseInt(m[1], 10) : 1;
}

function readRawText(user: string): string {
  const m = /## ユーザーの最初の入力\n([\s\S]*?)(?:\n## |$)/.exec(user);
  return (m?.[1] ?? user).trim();
}

function buildMemo(rawText: string): Memo {
  const title = rawText.slice(0, 24) || "メモ";
  const people = [...new Set(rawText.match(/[^\s、。]{1,8}さん/g) ?? [])].slice(0, 3);
  return {
    ...emptyMemo(),
    title,
    summary: `${title} の内容を整理しました（GEMINI_FAKE=1 のフェイク応答）。`,
    facts: [rawText.slice(0, 120)],
    keep: ["言われたことをその場で残せた"],
    try: ["結論を先に 1 文で伝える"],
    next_actions: [{ text: "最初の一歩を 3 行で書き出す", minutes: MAX_ACTION_MINUTES, due: null }],
    people,
    tags: ["fake"],
    horenso: {
      kind: "報告",
      to: people[0] ?? null,
      draft: "ご指摘の件、対応方針をまとめました。\n明日中に案をお見せします。",
    },
    communication: {
      said: rawText.slice(0, 100) || null,
      better: "結論からお伝えすると、〜します。理由は〜で、〜までに対応します。",
      vocabulary: [{ word: "所感", usage: "報告の末尾に自分の見立てを添えるとき" }],
      delivery_tip: "結論を最初の 1 文で言い切る",
    },
  };
}

function buildInsight(): Insight {
  return {
    good: ["今日も記録を残せた"],
    actions: ["未完了の最初の一歩を 15 分だけ進める"],
    message: "70 点で出すほうが、100 点で遅いより前に進みます。",
    communication: {
      focus: "前置きが長く、結論が後ろになりがち",
      phrase: "結論からお伝えすると、〜です。",
    },
  };
}
