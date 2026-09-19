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
- 本番環境の構築手順書（Terraform + wrangler）: [docs/ops/cloudflare-setup.md](docs/ops/cloudflare-setup.md)
- 備考（ノウハウ集: 並行開発 / Terraform / Mermaid / 無料枠の落とし穴 / 学びの運用）: [docs/notes/](docs/notes/README.md)
- 学びの台帳: [.claude/MEMORY.md](.claude/MEMORY.md)（ハマったら 1 行書いて `/learn` で昇格）
- AI エージェント向けの指示: [CLAUDE.md](CLAUDE.md)（パス別ルールは `.claude/rules/`）

## リポジトリ構成

アプリはリポジトリ直下に置き、フォルダで層を分けています（旧 `task-agent/` サブディレクトリは廃止）。

```
TaskAgent/
├── src/                        アプリ本体
│   ├── core/                   純粋ロジック。Cloudflare / React に依存しない（tsconfig.core.json が型で保証）
│   │   ├── memo.ts             メモの zod スキーマ（事実 / Keep / Try / 最初の一歩 / 報連相 / 伝え方）
│   │   ├── protocol.ts         Gemini とのやり取り（質問ラリー・インサイト）の検証
│   │   ├── prompts.ts          システムプロンプト（安定部分を先頭に置きキャッシュを効かせる）
│   │   ├── markdown.ts         日次 Markdown の描画
│   │   ├── dates.ts            タイムゾーン付きの日付処理
│   │   └── index.ts            core の公開窓口
│   ├── server/                 Cloudflare Worker（Hono）
│   │   ├── index.ts            Worker のエントリ（fetch + Cron の scheduled）
│   │   ├── app.ts              Hono アプリの組み立てと認証ミドルウェア
│   │   ├── env.ts              バインディング定義・Deps 注入・assertEnv
│   │   ├── routes/             auth / captures / memos / digests / settings
│   │   ├── services/           memoize（投げる → 質問 → メモ の進行）
│   │   ├── jobs/               digest（毎時 Cron の冪等な日次コミット）
│   │   ├── lib/                gemini / gemini-fake / gemini-factory / github / crypto / session
│   │   └── db/repo.ts          D1 アクセス（SQL はここだけ）
│   └── client/                 React SPA。API は Hono RPC で型付き
│       ├── main.tsx            エントリ
│       ├── App.tsx             画面の切り替えとおつかれモード
│       ├── api.ts              hc<AppType> のクライアント
│       ├── pages/              Login / Capture（投げる）/ Today（今日）/ Settings（設定）
│       ├── components/         Layout / MemoCard / CopyButton
│       └── styles.css          デザイントークン（大きい文字・コントラスト・おつかれモード）
│
├── test/                       テスト（pnpm test:unit → core + unit、pnpm test:workers → workers）
│   ├── core/                   src/core の単体テスト
│   ├── unit/                   fetch モックの単体テスト（Gemini / GitHub / 暗号 / スクリプト）
│   ├── workers/                workerd + 実物の D1 での結合テスト
│   └── fixtures/memo.ts        テスト共通のメモ見本（スキーマ変更はここ 1 箇所）
│
├── migrations/                 D1 マイグレーション（追記のみ・既存ファイルは編集しない）
│   └── 0001_init.sql           users / sessions / captures / conversation_turns / memos / daily_digests
│
├── docs/
│   ├── design-docs/            01 構成図 / 02 業務フロー / 03 ER / 04 技術選定 / 05 UI 設計 / 06 CI・CD
│   │   └── adr/                設計判断の記録（0001〜0008）
│   ├── dev/                    ai-dlc.md（開発フロー）/ setup.md（セットアップ）
│   ├── ops/                    cloudflare-setup.md（本番の環境構築手順書）
│   ├── notes/                  備考: Docker / 並行開発 / Terraform / Mermaid / 無料枠 / 学びの運用
│   └── product/                persona.md（ペルソナと設計原則）/ glossary.md（用語集）
│
├── infra/terraform/            D1・AI Gateway の IaC（state は R2）。Worker 本体は wrangler
│
├── scripts/                    check-claude-md / check-bundle-size / sync-wrangler-from-terraform / worktree
│
├── .claude/                    Claude Code 用の設定
│   ├── MEMORY.md               学びの台帳（ハマりを hooks / rules / docs へ昇格する）
│   ├── rules/                  パス別ルール（該当ファイルを触るときだけ読まれる）
│   ├── skills/                 /tdd /learn /design-sync /pr-ready
│   ├── agents/                 reviewer / test-writer
│   ├── hooks/                  整形・マイグレーション保護・起動時提示・終了時検査
│   └── settings.json           権限の allow / deny とフックの登録
│
├── .github/
│   ├── workflows/              ci.yml（dev イメージ内で verify）/ deploy.yml / infra.yml
│   ├── pull_request_template.md
│   └── CODEOWNERS
│
├── Dockerfile                  base → deps → dev / ci の 4 ステージ（glibc 必須・alpine 不可）
├── compose.yaml                app（開発サーバー）/ verify / cli
├── .dockerignore               秘密と成果物をイメージに入れない
├── wrangler.jsonc              Cloudflare の設定（D1 バインディング・Cron・Static Assets）
├── vite.config.ts              Vite + Cloudflare プラグイン（コンテナ向けの host 設定）
├── vitest.unit.config.ts       単体テストの設定
├── vitest.workers.config.ts    workerd 結合テストの設定
├── tsconfig.*.json             base / core（types 空）/ server / client / node の 5 構成
├── biome.json                  lint と整形
├── package.json                スクリプトと依存
├── CLAUDE.md                   AI エージェント向けの指示（人が読んでも短い）
└── .dev.vars.example           ローカルの環境変数のひな形（コピーして .dev.vars に）
```

読む順番に迷ったら、`src/core/memo.ts`（何を記録するか）→ `src/server/services/memoize.ts`（どう作るか）→ `src/server/jobs/digest.ts`（どう届けるか）の 3 ファイルです。

## 注意（社外秘の扱い）

入力は Gemini API に送信されます。Google AI Studio の無料枠は入力がサービス改善に利用され得ます（有料枠は利用されません）。
顧客名・金額・未公開情報はぼかして書いてください。UI にも同じ注意を常時表示しています。

## ライセンス

MIT
