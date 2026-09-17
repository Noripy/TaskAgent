import type { Memo } from "@taskagent/core";
import { CopyButton } from "./CopyButton.js";

/**
 * 疲れていても読める順番で並べる:
 * 1. タイトルと要約（何の話か）
 * 2. 最初の一歩（今すぐやること）
 * 3. 報連相の下書き（コピーして送る）
 * 4. 伝え方（言い換え・語彙・コツ）
 * 5. 良かったこと
 * 6. くわしく（事実・Try・関係者・タグ）は折りたたみ。おつかれモードでは非表示。
 */
export function MemoCard(props: {
  memo: Memo;
  createdAt?: string | undefined;
  onDelete?: (() => void) | undefined;
}) {
  const m = props.memo;
  const c = m.communication;
  const hasComm = !!(c.said || c.better || c.vocabulary.length || c.delivery_tip);
  const [first, ...rest] = m.next_actions;

  return (
    <article className="ta-card space-y-4">
      <header>
        <h3 className="ta-h2">{m.title}</h3>
        <p className="mt-1">{m.summary}</p>
      </header>

      {first && (
        <section aria-label="最初の一歩">
          <div className="ta-label">最初の一歩（15 分以内）</div>
          <div className="flex items-start gap-3 text-lg">
            <span className="ta-check" aria-hidden="true" />
            <span>
              {first.text}
              <span className="ta-muted ml-2 text-base">
                {first.minutes}分{first.due ? ` · ${first.due} まで` : ""}
              </span>
            </span>
          </div>
          {rest.length > 0 && (
            <ul className="ta-secondary mt-2 space-y-1 pl-1">
              {rest.map((a) => (
                <li key={a.text} className="flex items-start gap-3">
                  <span className="ta-check" aria-hidden="true" />
                  <span>
                    {a.text}
                    <span className="ta-muted ml-2 text-sm">{a.minutes}分</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {m.horenso.kind !== "なし" && m.horenso.draft && (
        <section aria-label="報連相の下書き" className="space-y-2">
          <div className="ta-label">
            {m.horenso.kind}
            {m.horenso.to ? ` → ${m.horenso.to}` : ""}
          </div>
          <p className="ta-quote">{m.horenso.draft}</p>
          <CopyButton text={m.horenso.draft} label="下書きをコピー" />
        </section>
      )}

      {hasComm && (
        <section aria-label="伝え方" className="space-y-2">
          <div className="ta-label">伝え方</div>
          {c.better && (
            <div>
              <div className="ta-muted text-sm">こう言うと伝わる</div>
              <p className="ta-quote">{c.better}</p>
            </div>
          )}
          {c.said && (
            <div className="ta-secondary">
              <div className="ta-muted text-sm">あなたの言い方</div>
              <p className="ta-muted">{c.said}</p>
            </div>
          )}
          {c.vocabulary.length > 0 && (
            <ul className="space-y-1">
              {c.vocabulary.map((v) => (
                <li key={v.word}>
                  <span className="ta-chip mr-2 font-semibold">{v.word}</span>
                  <span className="ta-muted">{v.usage}</span>
                </li>
              ))}
            </ul>
          )}
          {c.delivery_tip && (
            <p>
              <span className="ta-label inline">コツ</span> {c.delivery_tip}
            </p>
          )}
        </section>
      )}

      {m.keep.length > 0 && (
        <section aria-label="良かったこと" className="rounded-xl bg-good-soft p-3">
          <div className="ta-label" style={{ color: "var(--ta-good)" }}>
            良かったこと
          </div>
          <ul className="list-disc space-y-0.5 pl-5">
            {m.keep.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}

      <details className="ta-details ta-secondary">
        <summary>くわしく（事実・次に試すこと・関係者）</summary>
        <div className="space-y-3 pt-2">
          {m.facts.length > 0 && <List title="事実" items={m.facts} />}
          {m.try.length > 0 && <List title="次に試すこと" items={m.try} />}
          {(m.people.length > 0 || m.tags.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {m.people.map((p) => (
                <span key={p} className="ta-chip">
                  {p}
                </span>
              ))}
              {m.tags.map((t) => (
                <span key={t} className="ta-chip">
                  #{t}
                </span>
              ))}
            </div>
          )}
          <div className="ta-muted flex items-center justify-between text-sm">
            <span>
              {props.createdAt ? new Date(props.createdAt).toLocaleTimeString("ja-JP") : ""}
            </span>
            {props.onDelete && (
              <button
                type="button"
                onClick={props.onDelete}
                className="ta-btn ta-btn-quiet"
                style={{ color: "var(--ta-danger)" }}
              >
                このメモを削除
              </button>
            )}
          </div>
        </div>
      </details>
    </article>
  );
}

function List(props: { title: string; items: string[] }) {
  return (
    <div>
      <div className="ta-label">{props.title}</div>
      <ul className="list-disc space-y-0.5 pl-5">
        {props.items.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
