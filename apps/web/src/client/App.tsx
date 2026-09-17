import { useEffect, useState } from "react";
import { api, fetchMe, type PublicUser } from "./api.js";
import { Layout } from "./components/Layout.js";
import { CapturePage } from "./pages/Capture.js";
import { LoginPage } from "./pages/Login.js";
import { SettingsPage } from "./pages/Settings.js";
import { TodayPage } from "./pages/Today.js";

export type Route = "capture" | "today" | "settings";
export type ViewMode = "normal" | "calm";

const MODE_KEY = "ta-mode";

function routeFromPath(path: string): Route {
  if (path.startsWith("/today")) return "today";
  if (path.startsWith("/settings")) return "settings";
  return "capture";
}

function readMode(): ViewMode {
  try {
    return localStorage.getItem(MODE_KEY) === "calm" ? "calm" : "normal";
  } catch {
    return "normal";
  }
}

export function App() {
  const [user, setUser] = useState<PublicUser | null | undefined>(undefined);
  const [route, setRoute] = useState<Route>(() => routeFromPath(window.location.pathname));
  const [mode, setMode] = useState<ViewMode>(readMode);

  useEffect(() => {
    fetchMe().then(setUser);
    const onPop = () => setRoute(routeFromPath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // おつかれモードは <html data-mode> で全体に効かせる（CSS 変数で文字サイズ・行間・二次情報を切替）
  useEffect(() => {
    document.documentElement.dataset.mode = mode;
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      /* private mode 等では保存しない */
    }
  }, [mode]);

  const navigate = (r: Route) => {
    window.history.pushState(null, "", r === "capture" ? "/" : `/${r}`);
    setRoute(r);
  };

  if (user === undefined) {
    return <div className="ta-muted p-8 text-center">読み込み中…</div>;
  }
  if (user === null) return <LoginPage />;

  const logout = async () => {
    await api.api.auth.logout.$post();
    setUser(null);
  };

  return (
    <Layout
      user={user}
      route={route}
      mode={mode}
      onToggleMode={() => setMode(mode === "calm" ? "normal" : "calm")}
      onNavigate={navigate}
      onLogout={logout}
    >
      {route === "capture" && <CapturePage onSaved={() => navigate("today")} />}
      {route === "today" && <TodayPage user={user} onGoSettings={() => navigate("settings")} />}
      {route === "settings" && <SettingsPage user={user} onSaved={setUser} />}
    </Layout>
  );
}
