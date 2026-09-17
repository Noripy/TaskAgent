import type { Memo } from "@taskagent/core";
import { useState } from "react";
import { api, readError } from "../api.js";
import { MemoCard } from "../components/MemoCard.js";

type Phase =
  | { kind: "idle" }
  | {
      kind: "asking";
      captureId: string;
      round: number;
      questions: string[];
      log: Array<{ id: number; role: "assistant" | "user"; text: string }>;
    }
  | { kind: "done"; memo: Memo };

export function CapturePage(props: { onSaved: () => void }) {
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.api.captures.$post({ json: { text } });
      if (!res.ok) throw new Error(await readError(res));
      const r = await res.json();
      if (r.kind === "questions") {
        setPhase({
          kind: "asking",
          captureId: r.captureId,
          round: r.round,
          questions: r.questions,
          log: [],
        });
      } else {
        setPhase({ kind: "done", memo: r.memo });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const reply = async () => {
    if (phase.kind !== "asking" || !answer.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.api.captures[":id"].answer.$post({
        param: { id: phase.captureId },
        json: { text: answer },
      });
      if (!res.ok) throw new Error(await readError(res));
      const r = await res.json();
      const base = phase.log.length;
      const log = [
        ...phase.log,
        { id: base, role: "assistant" as const, text: phase.questions.join("\n") },
        { id: base + 1, role: "user" as const, text: answer },
      ];
      setAnswer("");
      if (r.kind === "questions") {
        setPhase({
          kind: "asking",
          captureId: r.captureId,
          round: r.round,
          questions: r.questions,
          log,
        });
      } else {
        setPhase({ kind: "done", memo: r.memo });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setText("");
    setAnswer("");
    setPhase({ kind: "idle" });
    setError(null);
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold">言われたこと・気づいたことを、そのまま投げる</h2>
        <p className="mt-1 text-sm text-slate-500">
          整えなくていい。単語の羅列でも OK。足りないところは AI が最大 3 回だけ聞き返します。
        </p>
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
          社外秘の情報（顧客名・金額・未公開情報）はぼかして書いてください。AI に送信されます。
        </p>
        {phase.kind === "idle" && (
          <div className="mt-3 space-y-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
              }}
              rows={5}
              placeholder="例: 田中さんに資料の順番おかしいって言われた 金曜まで 目次から直す？"
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">⌘/Ctrl + Enter で送信</span>
              <button
                type="button"
                onClick={submit}
                disabled={busy || !text.trim()}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
              >
                {busy ? "考え中…" : "投げる"}
              </button>
            </div>
          </div>
        )}
      </section>

      {phase.kind === "asking" && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-800">
            <div className="text-xs text-slate-500">あなたの入力</div>
            <p className="whitespace-pre-wrap">{text}</p>
          </div>
          {phase.log.map((l) => (
            <div key={l.id} className={`mb-2 text-sm ${l.role === "user" ? "text-right" : ""}`}>
              <span
                className={`inline-block rounded-lg px-3 py-2 ${l.role === "user" ? "bg-cyan-100 dark:bg-cyan-900/50" : "bg-slate-100 dark:bg-slate-800"}`}
              >
                {l.text}
              </span>
            </div>
          ))}
          <div className="text-xs text-slate-500">
            確認 {phase.round}/3 — 分かる範囲で答えれば十分です
          </div>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {phase.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") reply();
            }}
            rows={3}
            placeholder="例: 田中さん（先輩）。金曜 17 時まで。"
            className="mt-3 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <div className="mt-2 flex justify-between">
            <button
              type="button"
              onClick={reset}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              やり直す
            </button>
            <button
              type="button"
              onClick={reply}
              disabled={busy || !answer.trim()}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
            >
              {busy ? "考え中…" : "答える"}
            </button>
          </div>
        </section>
      )}

      {phase.kind === "done" && (
        <section className="space-y-3">
          <div className="text-sm text-emerald-700 dark:text-emerald-400">
            メモにしました。今日の 21 時に GitHub へ自動コミットされます。
          </div>
          <MemoCard memo={phase.memo} />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
            >
              もう 1 件投げる
            </button>
            <button
              type="button"
              onClick={props.onSaved}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-slate-900"
            >
              今日のメモを見る
            </button>
          </div>
        </section>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
