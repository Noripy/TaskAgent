import type { ReactNode } from "react";
import type { Route } from "../App.js";
import type { PublicUser } from "../api.js";

const NAV: Array<{ id: Route; label: string }> = [
  { id: "capture", label: "投げる" },
  { id: "today", label: "今日" },
  { id: "settings", label: "設定" },
];

export function Layout(props: {
  user: PublicUser;
  route: Route;
  onNavigate: (r: Route) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4">
      <header className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight">TaskAgent</span>
          <nav className="flex gap-1 rounded-lg bg-slate-200/70 p-1 dark:bg-slate-800">
            {NAV.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => props.onNavigate(n.id)}
                className={`rounded-md px-3 py-1 text-sm ${
                  props.route === n.id
                    ? "bg-white font-medium shadow-sm dark:bg-slate-700"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
                }`}
              >
                {n.label}
              </button>
            ))}
          </nav>
        </div>
        <button
          type="button"
          onClick={props.onLogout}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          title="ログアウト"
        >
          {props.user.avatar_url && (
            <img src={props.user.avatar_url} alt="" className="h-6 w-6 rounded-full" />
          )}
          {props.user.login}
        </button>
      </header>
      <main className="flex-1 pb-16">{props.children}</main>
    </div>
  );
}
