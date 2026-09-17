import { useState } from "react";
import { api, type PublicUser, readError } from "../api.js";

export function SettingsPage(props: { user: PublicUser; onSaved: (u: PublicUser) => void }) {
  const u = props.user;
  const [form, setForm] = useState({
    repo_owner: u.repo_owner ?? u.login,
    repo_name: u.repo_name ?? "",
    repo_branch: u.repo_branch,
    repo_path_prefix: u.repo_path_prefix,
    timezone: u.timezone,
    digest_hour: u.digest_hour,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await api.api.settings.$put({ json: form });
      if (!res.ok) throw new Error(await readError(res));
      const j = (await res.json()) as { user: PublicUser };
      props.onSaved(j.user);
      setMsg({ ok: true, text: "保存しました。書き込み権限も確認済みです。" });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const field = (
    label: string,
    key: keyof typeof form,
    hint?: string,
    type: "text" | "number" = "text",
  ) => (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input
        type={type}
        value={form[key]}
        onChange={(e) =>
          setForm({ ...form, [key]: type === "number" ? Number(e.target.value) : e.target.value })
        }
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
      />
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </label>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">メモの保存先</h2>
        <p className="mt-1 text-sm text-slate-500">
          あなたの GitHub リポジトリに、1 日 1 ファイルの Markdown
          としてコミットします。先にリポジトリを作っておいてください（private 推奨）。
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("オーナー", "repo_owner", "例: あなたのユーザー名")}
        {field("リポジトリ名", "repo_name", "例: work-notes")}
        {field("ブランチ", "repo_branch")}
        {field("保存フォルダ", "repo_path_prefix", "例: notes → notes/2026/09/2026-09-17.md")}
        {field("タイムゾーン", "timezone", "IANA 名。例: Asia/Tokyo")}
        {field("自動コミット時刻（時）", "digest_hour", "0〜23。現地時刻。", "number")}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
        >
          {busy ? "確認中…" : "保存して権限を確認"}
        </button>
        {msg && (
          <span className={`text-sm ${msg.ok ? "text-emerald-600" : "text-red-600"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
