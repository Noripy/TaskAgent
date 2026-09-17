import type { Memo } from "@taskagent/core";
import { useCallback, useEffect, useState } from "react";
import { api, type PublicUser, readError } from "../api.js";
import { MemoCard } from "../components/MemoCard.js";

type MemoItem = { id: string; created_at: string; memo: Memo };
type DigestInfo = {
  status: "pending" | "committed" | "failed";
  commit_sha: string | null;
  committed_at: string | null;
  last_error: string | null;
  insight: { good: string[]; actions: string[]; message: string } | null;
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
      else if (j.status === "skipped") setMsg(`スキップ: ${j.reason}`);
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDate(shiftDate(date, -1))}
            className="rounded px-2 py-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            ‹
          </button>
          <h2 className="text-xl font-semibold tabular-nums">{date}</h2>
          <button
            type="button"
            onClick={() => setDate(shiftDate(date, 1))}
            className="rounded px-2 py-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            ›
          </button>
        </div>
        <span className="text-xs text-slate-500">{memos.length} 件</span>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
        {!repoConfigured ? (
          <div className="flex items-center justify-between">
            <span>GitHub リポジトリが未設定です。</span>
            <button type="button" onClick={props.onGoSettings} className="text-cyan-600 underline">
              設定する
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs text-slate-500">GitHub</div>
              <div className="font-mono text-xs">{path}</div>
              <div className="mt-1 text-xs">
                {digest?.status === "committed" && (
                  <span className="text-emerald-600">
                    コミット済み {digest.commit_sha?.slice(0, 7)}
                  </span>
                )}
                {digest?.status === "failed" && (
                  <span className="text-red-600">失敗: {digest.last_error}</span>
                )}
                {!digest && (
                  <span className="text-slate-500">
                    未コミット（{props.user.digest_hour}:00 に自動）
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={commitNow}
              disabled={busy || memos.length === 0}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white disabled:opacity-40 dark:bg-white dark:text-slate-900"
            >
              {busy ? "処理中…" : "今すぐコミット"}
            </button>
          </div>
        )}
        {msg && <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">{msg}</div>}
      </section>

      {digest?.insight && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            今日の振り返り
          </div>
          <div className="mt-2 font-medium">良かったこと</div>
          <ul className="list-disc pl-5">
            {digest.insight.good.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
          <div className="mt-2 font-medium">明日の最初の一歩</div>
          <ul className="list-disc pl-5">
            {digest.insight.actions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <p className="mt-2 italic text-emerald-800 dark:text-emerald-200">
            {digest.insight.message}
          </p>
        </section>
      )}

      <section className="space-y-3">
        {memos.length === 0 && (
          <p className="text-sm text-slate-500">
            この日のメモはまだありません。「投げる」から 1 件どうぞ。
          </p>
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
    </div>
  );
}
