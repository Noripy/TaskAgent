// クライアント側の型チェック専用。
// クライアントは Hono RPC の AppType 経由でサーバー型を辿るため、Workers のグローバル型名を解決できる必要がある。
// DOM lib と workers-types のグローバル宣言を同居させると衝突するので、モジュール版から必要な型だけ持ち込む。
import type { D1Database as CfD1Database, Fetcher as CfFetcher } from "@cloudflare/workers-types";

declare global {
  interface D1Database extends CfD1Database {}
  interface Fetcher extends CfFetcher {}
}
