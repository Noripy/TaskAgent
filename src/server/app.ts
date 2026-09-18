import { Hono } from "hono";
import type { UserRow } from "./db/repo.js";
import { createRepo } from "./db/repo.js";
import { assertEnv, type Bindings, type Deps, defaultDeps } from "./env.js";
import { readSessionCookie } from "./lib/session.js";
import { authRoutes } from "./routes/auth.js";
import { captureRoutes } from "./routes/captures.js";
import { digestRoutes } from "./routes/digests.js";
import { memoRoutes } from "./routes/memos.js";
import { settingsRoutes } from "./routes/settings.js";

export type AppEnv = {
  Bindings: Bindings;
  Variables: { deps: Deps; repo: ReturnType<typeof createRepo>; user: UserRow };
};

/**
 * Hono アプリを組み立てる。deps を差し替えられるので、テストでは外部 API をフェイクにできる。
 */
export function createApp(deps: Deps = defaultDeps) {
  const authed = new Hono<AppEnv>()
    .use("*", async (c, next) => {
      const sid = await readSessionCookie(c, c.env.SESSION_SECRET);
      const user = sid
        ? await c.get("repo").findUserBySession(sid, deps.now().toISOString())
        : null;
      if (!user) return c.json({ error: "unauthorized" }, 401);
      c.set("user", user);
      await next();
    })
    .route("/captures", captureRoutes)
    .route("/memos", memoRoutes)
    .route("/digests", digestRoutes)
    .route("/settings", settingsRoutes);

  const app = new Hono<AppEnv>()
    .use("/api/*", async (c, next) => {
      assertEnv(c.env);
      c.set("deps", deps);
      c.set("repo", createRepo(c.env.DB));
      await next();
    })
    .get("/api/health", (c) => c.json({ ok: true, env: c.env.APP_ENV }, 200))
    .route("/api/auth", authRoutes)
    .route("/api", authed);

  app.onError((err, c) => {
    console.error("unhandled", err);
    const status = (err as { status?: number }).status;
    return c.json(
      { error: err.message },
      status && status >= 400 && status < 600 ? (status as 400) : 500,
    );
  });

  return app;
}

export type AppType = ReturnType<typeof createApp>;
