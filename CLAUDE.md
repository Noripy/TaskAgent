# TaskAgent

新社会人の「報連相」を支えるメモ化サービス。雑な入力 → Gemini が数回だけ聞き返す → 構造化メモ → 毎日ユーザーの GitHub リポジトリへ Markdown をコミット。
全体像は `docs/design-docs/01-architecture.md`、判断の理由は `docs/design-docs/04-tech-selection.md`。

## スタック（すべて Cloudflare 無料枠）
Workers（Hono）+ Workers Static Assets（React/Vite SPA）+ D1 + Cron Triggers。LLM は Gemini API（REST 直叩き）。認証と書き込みは GitHub OAuth のトークン 1 本。

## レイアウト
- `src/core` … 純粋ロジック（zod スキーマ / プロンプト / Markdown 描画 / 日付）。Cloudflare・React に依存しない（`tsconfig.core.json` が型で保証）。**まずここに書く**。
- `src/server` … Hono ルート・D1 リポジトリ・Gemini/GitHub クライアント・Cron ジョブ。
- `src/client` … React SPA。API は `hono/client` の RPC 型で呼ぶ。
- `migrations` … D1 マイグレーション（追記のみ、既存ファイルは編集しない）。
- `test/core` `test/unit` `test/workers` … 純粋ロジック / fetch モック / workerd + D1 結合。
- `docs/design-docs` … 構成図・業務フロー・ER・技術選定。仕様を変えたら同じ PR で更新。

## コマンド（このリポジトリで「検証」といえば `pnpm verify`）
```
pnpm verify        # lint + typecheck + test + build（PR 前に必ず通す）
pnpm test:unit     # 高速な単体テスト（src/core + fetch モック。TDD の内側ループ）
pnpm test:workers  # workerd + D1 の結合テスト
pnpm lint:fix      # Biome で整形
```

## 開発ルール（短く・守る）
1. **TDD**: 失敗するテストを先に書き、最小実装で通し、リファクタ。`src/core` はテストなしの変更を禁止。
2. 外部 I/O（fetch / 時刻 / ID）は `Deps` 経由で注入。テストで本物のネットワークを叩かない。
3. LLM の出力は必ず zod（`MemoSchema` 等）で検証してから保存。
4. 秘密情報は `wrangler secret` / `.dev.vars` のみ。コードやドキュメントに書かない。
5. 1 PR = 1 関心事。`src/core` と `src/server` / `src/client` を同時に大改修しない。
6. 迷ったら `docs/product/persona.md` のユーザー（20 代・完璧主義・過集中）にとって「最初の一歩が小さくなるか」で判断。
7. UI は `docs/design-docs/05-ui-design.md` の原則（大きい文字・固定した読む順番・二次情報は `.ta-secondary`）に従う。

詳細ルールはパス別に `.claude/rules/` に分割されている（該当ファイルを触るときだけ読み込まれる）。
