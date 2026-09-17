import { Hono } from "hono";
import type { AppEnv } from "../app.js";
import { envDefaults } from "../env.js";
import { encryptString } from "../lib/crypto.js";
import { exchangeCodeForToken, fetchViewer, oauthAuthorizeUrl } from "../lib/github.js";
import {
  clearSessionCookie,
  consumeOauthState,
  readSessionCookie,
  SESSION_TTL_SECONDS,
  setOauthState,
  setSessionCookie,
} from "../lib/session.js";

function redirectUri(c: { req: { url: string } }): string {
  const u = new URL(c.req.url);
  return `${u.origin}/api/auth/callback`;
}

export const authRoutes = new Hono<AppEnv>()
  .get("/github", async (c) => {
    const state = c.get("deps").newId();
    await setOauthState(c, c.env.SESSION_SECRET, state);
    return c.redirect(
      oauthAuthorizeUrl({
        clientId: c.env.GITHUB_CLIENT_ID,
        redirectUri: redirectUri(c),
        state,
        scope: envDefaults(c.env).scope,
      }),
    );
  })
  .get("/callback", async (c) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const expected = await consumeOauthState(c, c.env.SESSION_SECRET);
    if (!code || !state || !expected || state !== expected) {
      return c.json({ error: "invalid oauth state" }, 400);
    }
    const deps = c.get("deps");
    const token = await exchangeCodeForToken({
      clientId: c.env.GITHUB_CLIENT_ID,
      clientSecret: c.env.GITHUB_CLIENT_SECRET,
      code,
      redirectUri: redirectUri(c),
      fetchImpl: deps.fetch,
    });
    const viewer = await fetchViewer(deps.fetch, token);
    const now = deps.now();
    const d = envDefaults(c.env);
    const user = await c.get("repo").upsertUserFromGithub({
      id: deps.newId(),
      github_id: viewer.id,
      login: viewer.login,
      avatar_url: viewer.avatar_url,
      encrypted_token: await encryptString(token, c.env.TOKEN_ENCRYPTION_KEY),
      timezone: d.timezone,
      digest_hour: d.digestHour,
      now: now.toISOString(),
    });
    const sid = deps.newId();
    await c
      .get("repo")
      .createSession(
        sid,
        user.id,
        new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString(),
        now.toISOString(),
      );
    await setSessionCookie(c, c.env.SESSION_SECRET, sid);
    return c.redirect("/");
  })
  .post("/logout", async (c) => {
    const sid = await readSessionCookie(c, c.env.SESSION_SECRET);
    if (sid) await c.get("repo").deleteSession(sid);
    clearSessionCookie(c);
    return c.json({ ok: true }, 200);
  })
  .get("/me", async (c) => {
    const sid = await readSessionCookie(c, c.env.SESSION_SECRET);
    const user = sid
      ? await c.get("repo").findUserBySession(sid, c.get("deps").now().toISOString())
      : null;
    if (!user) return c.json({ user: null as PublicUser | null }, 200);
    return c.json({ user: publicUser(user) as PublicUser | null }, 200);
  });

export type PublicUser = ReturnType<typeof publicUser>;

export function publicUser(u: {
  id: string;
  login: string;
  avatar_url: string | null;
  repo_owner: string | null;
  repo_name: string | null;
  repo_branch: string;
  repo_path_prefix: string;
  timezone: string;
  digest_hour: number;
}) {
  return {
    id: u.id,
    login: u.login,
    avatar_url: u.avatar_url,
    repo_owner: u.repo_owner,
    repo_name: u.repo_name,
    repo_branch: u.repo_branch,
    repo_path_prefix: u.repo_path_prefix,
    timezone: u.timezone,
    digest_hour: u.digest_hour,
  };
}
