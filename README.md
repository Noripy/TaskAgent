# TaskAgent

**言われたことを、まず投げる。AI が数回だけ聞き返して「報連相できるメモ」にし、毎日あなたの GitHub リポジトリに Markdown で積み上げる。**

新社会人（20 代）で、完璧主義・過集中のせいで「人から入ってきた情報を捨ててしまう」人のためのサービスです。
Cloudflare の無料枠だけで動きます。

## 何ができるか

| 困りごと | TaskAgent の応答 |
|---|---|
| 言われたことを整理しようとして手が止まる | 整えずに投げてよい。Gemini が「誰から・いつまで・期待される成果物」だけ最大 3 回聞き返す |
| 報告・連絡・相談の文面が書けない | メモごとに、相手にそのまま送れる 3 行の下書きを生成 |
| タスクを分解できない | 「最初の一歩」を 15 分以内の粒度で提案 |
| 記録が散らばって振り返れない | 1 日 1 ファイルの Markdown を、あなたの GitHub リポジトリに毎日自動コミット |
| 自分の良かったところに気づけない | 日次で「良かったこと」「明日の行動」を 3 つずつ提案 |
| 語彙が足りず、伝え方が下手だと言われる | メモごとに「こう言うと伝わる」言い換え・使える語彙（最大 3）・コツ 1 つ。日次で癖を 1 つ指摘し、明日使うフレーズを提案 |
| 疲れていて画面を読むのがつらい | 「おつかれモード」で文字を大きく、二次情報を隠す。読む順番を固定した UI |

## 構成（詳細は `docs/design-docs/`）

```
Browser (React SPA) ──▶ Cloudflare Workers (Hono API) ──▶ D1 (SQLite)
                              │        │
                              │        └─▶ Gemini API（メモ化・振り返り）
                              └─ Cron 毎時 ─▶ GitHub Contents API（日次 Markdown をコミット）
```

- [01 システム構成図](docs/design-docs/01-architecture.md)
- [02 業務フロー図](docs/design-docs/02-business-flow.md)
- [03 ER 図](docs/design-docs/03-er-diagram.md)
- [04 技術選定（候補比較とメリット・デメリット）](docs/design-docs/04-tech-selection.md)
- [05 UI 設計（疲れていても読める画面）](docs/design-docs/05-ui-design.md)
- [ADR 一覧](docs/design-docs/adr/)

## セットアップ（ローカル 10 分）

前提: Node.js 22+, pnpm 10（`corepack enable` で入ります）

```bash
pnpm install
cp .dev.vars.example .dev.vars   # 値を埋める（下記）
pnpm db:migrate:local
pnpm dev                          # http://localhost:5173
```

`.dev.vars` に必要なもの:

| 変数 | 取得先 |
|---|---|
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub → Settings → Developer settings → OAuth Apps。Callback URL は `http://localhost:5173/api/auth/callback` |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/) の無料キー |
| `TOKEN_ENCRYPTION_KEY` | `openssl rand -base64 32` |
| `SESSION_SECRET` | `openssl rand -hex 32` |

詳しい手順とデプロイは [docs/dev/setup.md](docs/dev/setup.md)。

## 開発

```bash
pnpm verify          # lint + typecheck + test + build（PR 前に必ず）
pnpm test:unit       # 高速な単体テスト（src/core + fetch モック）
pnpm test:workers    # workerd + D1 の結合テスト
```

- 開発の進め方（TDD / AI-DLC / Claude Code の使い方）: [docs/dev/ai-dlc.md](docs/dev/ai-dlc.md)
- 並行開発（worktree / 境界 / CI）: [docs/dev/parallel-development.md](docs/dev/parallel-development.md)
- AI エージェント向けの指示: [CLAUDE.md](CLAUDE.md)（パス別ルールは `.claude/rules/`）

## リポジトリ構成

アプリはリポジトリ直下に置き、フォルダで層を分けています（旧 `task-agent/` サブディレクトリは廃止）。

```
src/core             純粋ロジック（zod スキーマ・プロンプト・Markdown 描画・日付）。Cloudflare / React に依存しない
src/server           Cloudflare Worker: Hono ルート / D1 リポジトリ / Gemini・GitHub クライアント / Cron ジョブ
src/client           React SPA（投げる / 今日 / 設定）。API は Hono RPC で型付き
migrations           D1 マイグレーション（追記のみ）
test/core            src/core の単体テスト
test/unit            fetch モックの単体テスト（Gemini / GitHub / 暗号）
test/workers         workerd 上の結合テスト（D1 実物）
docs/design-docs     構成図・業務フロー・ER・技術選定・UI 設計・ADR
docs/dev             開発フロー（AI-DLC / TDD）・並行開発・セットアップ
docs/product         ペルソナ・用語集
.claude              Claude Code 用の設定・ルール・スキル・サブエージェント・フック
.github/workflows    CI（verify）と Deploy（main → wrangler deploy）
wrangler.jsonc       Cloudflare の設定（D1 バインディング・Cron）
```

`src/core` は `tsconfig.core.json`（Workers / DOM の型を読み込まない設定）で型チェックされるため、Cloudflare 依存が混ざるとコンパイルで落ちます。

## 注意（社外秘の扱い）

入力は Gemini API に送信されます。Google AI Studio の無料枠は入力がサービス改善に利用され得ます（有料枠は利用されません）。
顧客名・金額・未公開情報はぼかして書いてください。UI にも同じ注意を常時表示しています。

## ライセンス

MIT
