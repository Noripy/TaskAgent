import type { ReactNode } from "react";
import type { Route, ViewMode } from "../App.js";
import type { PublicUser } from "../api.js";

const NAV: Array<{ id: Route; label: string }> = [
  { id: "capture", label: "投げる" },
  { id: "today", label: "今日" },
  { id: "settings", label: "設定" },
];

export function Layout(props: {
  user: PublicUser;
  route: Route;
  mode: ViewMode;
  onToggleMode: () => void;
  onNavigate: (r: Route) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const calm = props.mode === "calm";
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4">
      <header className="flex flex-col gap-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="ta-h2 whitespace-nowrap">TaskAgent</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={props.onToggleMode}
              aria-pressed={calm}
              aria-label={calm ? "おつかれモードをやめる" : "おつかれモードにする"}
              className={`ta-btn whitespace-nowrap ${calm ? "ta-btn-primary" : ""}`}
              title="文字を大きく、情報を減らして表示します"
            >
              {calm ? "おつかれ中" : "おつかれ"}
            </button>
            <button
              type="button"
              onClick={props.onLogout}
              className="ta-btn ta-btn-quiet px-1"
              title={`${props.user.login} — ログアウト`}
              aria-label={`${props.user.login} としてログイン中。ログアウト`}
            >
              {props.user.avatar_url ? (
                <img src={props.user.avatar_url} alt="" className="h-9 w-9 rounded-full" />
              ) : (
                <span className="ta-chip flex h-9 w-9 items-center justify-center font-bold uppercase">
                  {props.user.login.slice(0, 1)}
                </span>
              )}
            </button>
          </div>
        </div>
        <nav aria-label="主要" className="grid grid-cols-3 gap-2">
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => props.onNavigate(n.id)}
              aria-current={props.route === n.id ? "page" : undefined}
              className={`ta-btn whitespace-nowrap px-2 ${props.route === n.id ? "ta-btn-primary" : ""}`}
            >
              {n.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="flex-1 pb-20">{props.children}</main>
    </div>
  );
}
