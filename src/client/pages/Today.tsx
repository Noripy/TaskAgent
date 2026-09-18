import { useCallback, useEffect, useState } from "react";
import type { Insight, Memo } from "../../core/index.js";
import { api, type PublicUser, readError } from "../api.js";
import { CopyButton } from "../components/CopyButton.js";
import { MemoCard } from "../components/MemoCard.js";

type MemoItem = { id: string; created_at: string; memo: Memo };
type DigestInfo = {
  status: "pending" | "committed" | "failed";
  commit_sha: string | null;
  committed_at: string | null;
  last_error: string | null;
  insight: Insight | null;
} | null;

function todayYmd(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function shiftDate(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function humanDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
  const w = ["日", "月", "火", "水", "木", "金", "土"][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}月${d}日（${w}）`;
}

export function TodayPage(props: { user: PublicUser; onGoSettings: () => void }) {
  const [date, setDate] = useState(() => todayYmd(props.user.timezone));
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [digest, setDigest] = useState<DigestInfo>(null);
  const [path, setPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [m, d] = await Promise.all([
      api.api.memos.$get({ query: { date } }),
      api.api.digests[":date"].$get({ param: { date } }),
    ]);
    if (m.ok) setMemos(((await m.json()) as { memos: MemoItem[] }).memos);
    if (d.ok) {
      const j = (await d.json()) as { digest: DigestInfo; path: string | null };
      setDigest(j.digest);
      setPath(j.path);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const commitNow = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await api.api.digests[":date"].commit.$post({ param: { date } });
      const j = (await res.json()) as {
        status: string;
        reason?: string;
        error?: string;
        path?: string;
      };
      if (j.status === "committed") setMsg(`コミットしました: ${j.path}`);
      else if (j.status === "skipped") setMsg(`変更なし（${j.reason}）`);
      else setMsg(`失敗: ${j.error ?? (await readError(res))}`);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("このメモを削除しますか？")) return;
    await api.api.memos[":id"].$delete({ param: { id } });
    await load();
  };

  const repoConfigured = !!(props.user.repo_owner && props.user.repo_name);
  const insight = digest?.insight ?? null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setDate(shiftDate(date, -1))}
          className="ta-btn"
          aria-label="前の日"
        >
          ‹
        </button>
        <h2 className="ta-h1 text-center">
          {humanDate(date)}
          <span className="ta-muted block text-base font-normal">{memos.length} 件のメモ</span>
        </h2>
        <button
          type="button"
          onClick={() => setDate(shiftDate(date, 1))}
          className="ta-btn"
          aria-label="次の日"
        >
          ›
        </button>
      </div>

      {!repoConfigured && (
        <div className="rounded-xl bg-warn-soft p-3" style={{ color: "var(--ta-warn)" }}>
          GitHub の保存先が未設定です。{" "}
          <button type="button" onClick={props.onGoSettings} className="ta-link underline">
            設定する
          </button>
        </div>
      )}

      {insight && (
        <section className="ta-card space-y-4" aria-label="今日の振り返り">
          <h3 className="ta-h2">今日の振り返り</h3>
          <div>
            <div className="ta-label" style={{ color: "var(--ta-good)" }}>
              良かったこと
            </div>
            <ul className="list-disc space-y-1 pl-5 text-lg">
              {insight.good.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="ta-label">明日の最初の一歩</div>
            <ul className="space-y-1">
              {insight.actions.map((a) => (
                <li key={a} className="flex items-start gap-3 text-lg">
                  <span className="ta-check" aria-hidden="true" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
          {(insight.communication.focus || insight.communication.phrase) && (
            <div className="space-y-2">
              <div className="ta-label">伝え方の改善点</div>
              {insight.communication.focus && (
                <p className="text-lg">{insight.communication.focus}</p>
              )}
              {insight.communication.phrase && (
                <>
                  <div className="ta-muted text-sm">明日使うフレーズ</div>
                  <p className="ta-quote">{insight.communication.phrase}</p>
                  <CopyButton text={insight.communication.phrase} label="フレーズをコピー" />
                </>
              )}
            </div>
          )}
          <p className="ta-muted italic">{insight.message}</p>
        </section>
      )}

      <section className="space-y-4" aria-label="メモ">
        {memos.length === 0 && (
          <p className="ta-muted">この日のメモはまだありません。「投げる」から 1 件どうぞ。</p>
        )}
        {memos.map((m) => (
          <MemoCard
            key={m.id}
            memo={m.memo}
            createdAt={m.created_at}
            onDelete={() => remove(m.id)}
          />
        ))}
      </section>

      {repoConfigured && (
        <section className="ta-card ta-secondary space-y-2" aria-label="GitHub への保存">
          <div className="ta-label">GitHub への保存</div>
          <div className="ta-muted break-all text-sm">{path}</div>
          <div>
            {digest?.status === "committed" && (
              <span style={{ color: "var(--ta-good)" }}>
                コミット済み {digest.commit_sha?.slice(0, 7)}
              </span>
            )}
            {digest?.status === "failed" && (
              <span style={{ color: "var(--ta-danger)" }}>失敗: {digest.last_error}</span>
            )}
            {!digest && (
              <span className="ta-muted">
                未コミット（毎日 {props.user.digest_hour}:00 に自動）
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={commitNow}
            disabled={busy || memos.length === 0}
            className="ta-btn"
          >
            {busy ? "処理中…" : "今すぐコミット"}
          </button>
          {msg && <p className="ta-muted text-sm">{msg}</p>}
        </section>
      )}
    </div>
  );
}
