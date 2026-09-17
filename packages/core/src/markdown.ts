import { hasCommunication, type Memo } from "./memo.js";
import type { Insight } from "./protocol.js";

export interface MemoRecord {
  id: string;
  createdAtIso: string;
  memo: Memo;
}

const bullet = (items: readonly string[]) => items.map((s) => `- ${s}`).join("\n");

/** 1 メモを Markdown セクションに。決定的（同じ入力→同じ出力）であること。 */
export function renderMemoMarkdown(rec: MemoRecord): string {
  const m = rec.memo;
  const out: string[] = [];
  out.push(`### ${m.title}`);
  out.push("");
  out.push(`<!-- memo:${rec.id} ${rec.createdAtIso} -->`);
  out.push("");
  out.push(m.summary);
  if (m.facts.length) out.push("", "**事実**", "", bullet(m.facts));
  if (m.keep.length) out.push("", "**良かったこと (Keep)**", "", bullet(m.keep));
  if (m.try.length) out.push("", "**次に試すこと (Try)**", "", bullet(m.try));
  if (m.next_actions.length) {
    out.push("", "**最初の一歩 (15 分以内)**", "");
    out.push(
      m.next_actions
        .map((a) => `- [ ] ${a.text} (${a.minutes}分${a.due ? `, ${a.due} まで` : ""})`)
        .join("\n"),
    );
  }
  if (m.horenso.kind !== "なし") {
    out.push("", `**${m.horenso.kind}${m.horenso.to ? ` → ${m.horenso.to}` : ""}**`, "");
    if (m.horenso.draft) out.push("> " + m.horenso.draft.split("\n").join("\n> "));
  }
  if (hasCommunication(m.communication)) {
    const c = m.communication;
    out.push("", "**伝え方**", "");
    if (c.said) out.push(`- 言った: ${c.said}`);
    if (c.better) out.push(`- 言い換え: ${c.better}`);
    if (c.vocabulary.length) {
      out.push("- 語彙:");
      out.push(c.vocabulary.map((v) => `  - ${v.word} — ${v.usage}`).join("\n"));
    }
    if (c.delivery_tip) out.push(`- コツ: ${c.delivery_tip}`);
  }
  const meta: string[] = [];
  if (m.people.length) meta.push(`関係者: ${m.people.join(", ")}`);
  if (m.tags.length) meta.push(`タグ: ${m.tags.map((t) => `#${t}`).join(" ")}`);
  if (meta.length) out.push("", meta.map((s) => `_${s}_`).join("  "));
  return out.join("\n");
}

export interface DigestInput {
  date: string;
  timeZone: string;
  memos: MemoRecord[];
  insight: Insight | null;
}

/** 1 日分の Markdown。GitHub に置くファイルの本文そのもの。 */
export function renderDailyDigest(input: DigestInput): string {
  const out: string[] = [];
  out.push("---");
  out.push(`date: ${input.date}`);
  out.push(`timezone: ${input.timeZone}`);
  out.push(`memos: ${input.memos.length}`);
  out.push("generated_by: TaskAgent");
  out.push("---");
  out.push("");
  out.push(`# ${input.date} の記録`);
  out.push("");
  if (input.insight) {
    out.push("## 今日の振り返り");
    out.push("");
    out.push("**良かったこと**");
    out.push("");
    out.push(bullet(input.insight.good));
    out.push("");
    out.push("**明日の最初の一歩**");
    out.push("");
    out.push(input.insight.actions.map((a) => `- [ ] ${a}`).join("\n"));
    out.push("");
    if (input.insight.communication.focus || input.insight.communication.phrase) {
      out.push("**伝え方の改善点**");
      out.push("");
      if (input.insight.communication.focus) out.push(`- ${input.insight.communication.focus}`);
      if (input.insight.communication.phrase) {
        out.push(`- 明日使うフレーズ: 「${input.insight.communication.phrase}」`);
      }
      out.push("");
    }
    out.push(`> ${input.insight.message}`);
    out.push("");
  }
  out.push("## メモ");
  out.push("");
  if (input.memos.length === 0) {
    out.push("_この日のメモはありません。_");
  } else {
    const sorted = [...input.memos].sort((a, b) => a.createdAtIso.localeCompare(b.createdAtIso));
    out.push(sorted.map(renderMemoMarkdown).join("\n\n"));
  }
  out.push("");
  return out.join("\n");
}

export function memosToPlainMarkdown(memos: MemoRecord[]): string {
  return memos.map(renderMemoMarkdown).join("\n\n");
}
