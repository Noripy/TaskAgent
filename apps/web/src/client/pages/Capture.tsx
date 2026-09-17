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

  const onEnter = (fn: () => void) => (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") fn();
  };

  return (
    <div className="space-y-5">
      {phase.kind === "idle" && (
        <section className="space-y-3">
          <h2 className="ta-h1">言われたこと、気づいたことを、そのまま投げる</h2>
          <p className="ta-muted">
            整えなくていい。単語の羅列でも大丈夫。足りないところは最大 3 回だけ聞き返します。
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onEnter(submit)}
            rows={6}
            aria-label="入力"
            placeholder="例: 田中さんに資料の順番おかしいって言われた 金曜まで 目次から直す？"
            className="ta-input"
          />
          <button
            type="button"
            onClick={submit}
            disabled={busy || !text.trim()}
            className="ta-btn ta-btn-primary w-full"
          >
            {busy ? "考え中…" : "投げる"}
          </button>
          <p className="ta-secondary ta-muted text-sm">
            ⌘/Ctrl + Enter で送信。社外秘（顧客名・金額・未公開情報）はぼかして書いてください。AI
            に送信されます。
          </p>
        </section>
      )}

      {phase.kind === "asking" && (
        <section className="ta-card space-y-4">
          <div className="ta-secondary">
            <div className="ta-label">あなたの入力</div>
            <p className="ta-muted whitespace-pre-wrap">{text}</p>
          </div>
          {phase.log.length > 0 && (
            <div className="ta-secondary space-y-2">
              {phase.log.map((l) => (
                <div key={l.id} className={l.role === "user" ? "text-right" : ""}>
                  <span className="ta-chip whitespace-pre-wrap text-left">
                    {l.role === "user" ? "あなた: " : "質問: "}
                    {l.text}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div>
            <div className="ta-label">確認 {phase.round} / 3</div>
            <ul className="list-disc space-y-1 pl-5 text-lg">
              {phase.questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
            <p className="ta-muted mt-1 text-sm">
              分かる範囲で答えれば十分です。分からなければ「不明」と書いてください。
            </p>
          </div>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={onEnter(reply)}
            rows={3}
            aria-label="回答"
            placeholder="例: 田中さん（先輩）。金曜 17 時まで。"
            className="ta-input"
          />
          <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-between">
            <button
              type="button"
              onClick={reply}
              disabled={busy || !answer.trim()}
              className="ta-btn ta-btn-primary"
            >
              {busy ? "考え中…" : "答える"}
            </button>
            <button type="button" onClick={reset} className="ta-btn ta-btn-quiet">
              やり直す
            </button>
          </div>
        </section>
      )}

      {phase.kind === "done" && (
        <section className="space-y-4">
          <p className="rounded-xl bg-good-soft p-3" style={{ color: "var(--ta-good)" }}>
            メモにしました。設定した時刻に GitHub へ自動でコミットされます。
          </p>
          <MemoCard memo={phase.memo} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={reset} className="ta-btn ta-btn-primary flex-1">
              もう 1 件投げる
            </button>
            <button type="button" onClick={props.onSaved} className="ta-btn flex-1">
              今日のメモを見る
            </button>
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-warn-soft p-3" style={{ color: "var(--ta-warn)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
