import type { Context } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";

export const SESSION_COOKIE = "ta_session";
export const OAUTH_STATE_COOKIE = "ta_oauth_state";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 日

function secure(c: Context): boolean {
  return new URL(c.req.url).protocol === "https:";
}

export async function setSessionCookie(
  c: Context,
  secret: string,
  sessionId: string,
): Promise<void> {
  await setSignedCookie(c, SESSION_COOKIE, sessionId, secret, {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: secure(c),
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function readSessionCookie(c: Context, secret: string): Promise<string | null> {
  const v = await getSignedCookie(c, secret, SESSION_COOKIE);
  return v || null;
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

export async function setOauthState(c: Context, secret: string, state: string): Promise<void> {
  await setSignedCookie(c, OAUTH_STATE_COOKIE, state, secret, {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: secure(c),
    maxAge: 600,
  });
}

export async function consumeOauthState(c: Context, secret: string): Promise<string | null> {
  const v = await getSignedCookie(c, secret, OAUTH_STATE_COOKIE);
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: "/" });
  return v || null;
}
