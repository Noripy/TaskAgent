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
- `docs/ops` … 環境構築手順書。`infra/terraform` … D1・AI Gateway の IaC（Worker は wrangler）。
- `docs/notes` … 備考（ノウハウ集）。Docker・並行開発・Terraform・Mermaid・無料枠の落とし穴。
- `Dockerfile` / `compose.yaml` … ローカル・CI・デプロイで共有する実行環境（glibc 必須、alpine 不可）。

## コマンド（このリポジトリで「検証」といえば `pnpm verify`）
```
pnpm docker:dev    # Docker で開発サーバー（既定。ホストに Node.js 不要）
pnpm docker:verify # CI とまったく同じ検証を Docker の中で
pnpm verify        # lint + check:docs + typecheck + test + build + size（PR 前に必ず通す）
pnpm test:unit     # 高速な単体テスト（src/core + fetch モック。TDD の内側ループ）
pnpm test:workers  # workerd + D1 の結合テスト
pnpm lint:fix      # Biome で整形
pnpm check:docs    # CLAUDE.md / rules に書いたパスとコマンドが実在するか
pnpm cf:deploy     # 手動デプロイ（script 名を deploy にすると pnpm 組み込みに奪われる）
```

## 開発ルール（短く・守る）
1. **TDD**: 失敗するテストを先に書き、最小実装で通し、リファクタ。`src/core` はテストなしの変更を禁止。
2. 外部 I/O（fetch / 時刻 / ID）は `Deps` 経由で注入。テストで本物のネットワークを叩かない。
3. LLM の出力は必ず zod（`MemoSchema` 等）で検証してから保存。
4. 秘密情報は `wrangler secret` / `.dev.vars` のみ。コードやドキュメントに書かない。
5. 1 PR = 1 関心事。`src/core` と `src/server` / `src/client` を同時に大改修しない。
6. 迷ったら `docs/product/persona.md` のユーザー（20 代・完璧主義・過集中）にとって「最初の一歩が小さくなるか」で判断。
7. UI は `docs/design-docs/05-ui-design.md` の原則（大きい文字・固定した読む順番・二次情報は `.ta-secondary`）に従う。
8. **学びは台帳へ**: ハマったら `.claude/MEMORY.md` に 1 行書き、`/learn` で hooks / rules / settings / CLAUDE.md / `docs/notes` のどれかに同じコミットで昇格する。「未反映」のまま終えると Stop フックが差し戻す。
9. scripts・フォルダ・ルールを変えたら、この CLAUDE.md も同じ PR で直す（`pnpm check:docs` がズレを検知する）。
10. 実行環境を変える（依存追加・Node/pnpm 更新）ときは `Dockerfile` も同じ PR で更新し、`pnpm docker:verify` を通す。CI は同じイメージで動く。

詳細ルールはパス別に `.claude/rules/` に分割されている（該当ファイルを触るときだけ読み込まれる）。
