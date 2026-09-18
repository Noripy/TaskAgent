import { hc } from "hono/client";
import type { AppType } from "../server/app.js";

/** Hono RPC: サーバーのルート型からクライアントを生成。API の型ズレはビルド時に落ちる。 */
export const api = hc<AppType>("/", { init: { credentials: "same-origin" } });

export type { PublicUser } from "../server/routes/auth.js";

import type { PublicUser } from "../server/routes/auth.js";

export async function fetchMe(): Promise<PublicUser | null> {
  const res = await api.api.auth.me.$get();
  const json = await res.json();
  return json.user;
}

export async function readError(
  res: { json(): Promise<unknown> },
  fallback = "エラーが発生しました",
): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string | { message?: string } };
    if (typeof j.error === "string") return j.error;
    if (j.error && typeof j.error === "object" && j.error.message) return j.error.message;
  } catch {
    /* ignore */
  }
  return fallback;
}
