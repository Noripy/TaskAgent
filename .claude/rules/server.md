---
paths:
  - "apps/web/src/server/**"
  - "apps/web/migrations/**"
---
# apps/web/src/server のルール
- ルートは `new Hono<AppEnv>().get(...).post(...)` のメソッドチェーンで定義する（Hono RPC の型推論に必要）。`c.json(body, status)` は status を必ず明示。
- ルートは薄く。ビジネスロジックは `services/`・`jobs/`、SQL は `db/repo.ts` に閉じ込める。
- 外部 API は `c.get("deps").fetch` を使う。`globalThis.fetch` 直呼び禁止。
- D1 のマイグレーションは追記のみ。`0001_init.sql` などの既存ファイルは編集せず、次の番号を追加する。
- GitHub トークンは `encryptString` で暗号化して保存。ログに出さない。
- Cron ハンドラは冪等に。同じ日を 2 回実行しても GitHub に同じ内容を二重コミットしない（content_hash で判定）。
- 結合テストは `test/workers/`（workerd + D1）。外部 API は `fakeExternal()` で差し替える。
