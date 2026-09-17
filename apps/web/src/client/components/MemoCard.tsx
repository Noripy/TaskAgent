import type { Memo } from "@taskagent/core";

export function MemoCard(props: {
  memo: Memo;
  createdAt?: string | undefined;
  onDelete?: (() => void) | undefined;
}) {
  const m = props.memo;
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold">{m.title}</h3>
        {props.onDelete && (
          <button
            type="button"
            onClick={props.onDelete}
            className="text-xs text-slate-400 hover:text-red-500"
          >
            削除
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{m.summary}</p>

      {m.facts.length > 0 && <Section title="事実" items={m.facts} />}
      {m.keep.length > 0 && <Section title="良かったこと" items={m.keep} tone="good" />}
      {m.try.length > 0 && <Section title="次に試すこと" items={m.try} />}
      {m.next_actions.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            最初の一歩（15 分以内）
          </div>
          <ul className="mt-1 space-y-1 text-sm">
            {m.next_actions.map((a) => (
              <li key={a.text} className="flex items-start gap-2">
                <span className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded border border-slate-300" />
                <span>
                  {a.text}
                  <span className="ml-1 text-xs text-slate-500">
                    {a.minutes}分{a.due ? ` · ${a.due} まで` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {m.horenso.kind !== "なし" && (
        <div className="mt-3 rounded-lg bg-cyan-50 p-3 text-sm dark:bg-cyan-950/40">
          <div className="text-xs font-medium text-cyan-800 dark:text-cyan-300">
            {m.horenso.kind}
            {m.horenso.to ? ` → ${m.horenso.to}` : ""}
          </div>
          {m.horenso.draft && <p className="mt-1 whitespace-pre-wrap">{m.horenso.draft}</p>}
          {m.horenso.draft && (
            <button
              type="button"
              className="mt-2 text-xs text-cyan-700 underline dark:text-cyan-300"
              onClick={() => navigator.clipboard?.writeText(m.horenso.draft ?? "")}
            >
              下書きをコピー
            </button>
          )}
        </div>
      )}
      {(m.people.length > 0 || m.tags.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1 text-xs text-slate-500">
          {m.people.map((p) => (
            <span key={p} className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
              {p}
            </span>
          ))}
          {m.tags.map((t) => (
            <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
              #{t}
            </span>
          ))}
        </div>
      )}
      {props.createdAt && (
        <div className="mt-2 text-right text-[11px] text-slate-400">
          {new Date(props.createdAt).toLocaleTimeString("ja-JP")}
        </div>
      )}
    </article>
  );
}

function Section(props: { title: string; items: string[]; tone?: "good" }) {
  return (
    <div className="mt-3">
      <div
        className={`text-xs font-medium uppercase tracking-wide ${props.tone === "good" ? "text-emerald-600" : "text-slate-500"}`}
      >
        {props.title}
      </div>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
        {props.items.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
