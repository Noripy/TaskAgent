# 04. 技術選定

前提（MUST）: **無料枠で完結**、**IaaS は Cloudflare で完結**、要件（Gemini でメモ化 → 日次で GitHub にコミット）と最もシナジーがあること。
各領域で候補を並べ、メリット・デメリットを出したうえで決めた。決定の経緯は `adr/` にも 1 枚ずつ残している。

## 0. 3 つのプラン

| | A. 最小工数プラン | **B. 推奨プラン（採用）** | C. 拡張プラン |
|---|---|---|---|
| ローカル環境 | ホストに Node.js を直接 | **Docker Compose（CI と同一イメージ）** | 同左 + Dev Container |
| フロント | Hono の `hono/jsx` で SSR（ビルド不要） | React SPA（Vite）+ Hono RPC | 同左 + PWA / オフライン |
| API | Hono on Workers | Hono on Workers | 同左 + Durable Objects（ユーザー単位アクター） |
| DB | D1 | D1 | D1 + DO SQLite（対話状態） |
| LLM | Gemini REST | Gemini REST（AI Gateway 任意） | 同左 + Workers AI をフォールバック |
| 日次コミット | Cron Trigger | Cron Trigger（冪等・リトライ） | Workflows（ステップ再試行・可観測性） |
| 認証 | GitHub OAuth | GitHub OAuth | 同左 + Cloudflare Access（社内配布時） |
| 工数感 | 1〜2 日 | 3〜5 日 | +1〜2 週 |
| 向く場面 | 自分ひとりで今すぐ使う | 数人〜数百人に配る・改善を続ける | チーム導入・監査要件 |

B を採用した理由: A は「対話ラリー」の UI が SSR だと書きにくく、後で React に載せ替える手戻りが大きい。C は無料枠に収まるが、最初の価値検証には過剰。**B は A の 2 倍の工数で C への道が閉じない。**

## 1. アプリケーションフレームワーク

| 候補 | メリット | デメリット | 判定 |
|---|---|---|---|
| **Hono + React (Vite) on Workers Static Assets** | Cloudflare 公式が推す構成で `@cloudflare/vite-plugin` が両方を 1 コマンドでビルド。Worker が 285KB と小さく無料枠の 3MB 制限に余裕。Hono RPC で API の型がクライアントまで通る。既存コードが React なので学習コストゼロ | SSR しないので初回表示は SPA 相応。ルーティングを自作（今回は 3 画面なので十分） | **採用** |
| Next.js + OpenNext (既存リポジトリの延長) | 既存スキャフォールドを活かせる。エコシステムが最大 | Worker バンドルが肥大化しやすく無料枠の 3MB 圧縮上限に当たりやすい。OpenNext 経由の互換問題を追う工数が要件と無関係。Server Actions など Cloudflare で価値を出しにくい機能が多い | 不採用（[ADR-0002](adr/0002-drop-nextjs.md)） |
| SvelteKit + adapter-cloudflare | バンドル最小・DX 良好・公式アダプタあり | React からの乗り換えコスト。Hono RPC のような API 型共有が標準にない | 不採用 |
| Hono + hono/jsx SSR のみ | 最小構成、ビルドすら不要 | 対話 UI（質問ラリー）の状態管理が煩雑。後で SPA 化すると二度手間 | 最小工数プラン A として保留 |

## 2. データストア

| 候補 | メリット | デメリット | 判定 |
|---|---|---|---|
| **D1 (SQLite)** | 無料枠が広い（5GB / 読 5M / 書 100k 行/日）。SQL で ER 図どおりに表現でき、`vitest-pool-workers` でローカル実 DB テストが可能。マイグレーション管理が wrangler 標準 | 単一リージョン（読み取りレプリカは設定可）。トランザクションは `batch` 単位 | **採用** |
| Workers KV | 最も簡単・グローバル分散 | **無料枠の書込が 1,000/日**で対話ターンの保存に足りない。結果整合で「今保存したメモが一覧に出ない」が起きる | 不採用 |
| Durable Objects (SQLite) | ユーザー単位のアクターで対話状態と相性抜群。無料プランでも利用可に | 概念の学習コストが高い。ER 図・集計クエリが書きにくい | 拡張プラン C で検討 |
| R2 に JSON/Markdown | 「最終成果物が Markdown」と相性が良い | クエリ不能。GitHub リポジトリが既に永続ノートの役割なので二重管理 | 不採用 |

## 3. LLM

| 候補 | メリット | デメリット | 判定 |
|---|---|---|---|
| **Gemini API を REST で直叩き（`gemini-2.5-flash`）** | 要件で指定。AI Studio の無料キーで動く。`responseSchema` で JSON を強制でき、zod 検証と二重で守れる。SDK 不要でバンドルが小さい | 無料枠は RPM/RPD 制限があり、無料枠の入力は Google のサービス改善に使われ得る（社外秘の注意を UI に常設） | **採用** |
| `@google/genai` SDK | 型が付く・機能追従が早い | Workers で不要な依存が増える。REST で必要な 1 エンドポイントしか使わない | 不採用 |
| **+ Cloudflare AI Gateway（任意）** | 無料でキャッシュ・ログ・レート制限・コスト可視化。`GEMINI_BASE_URL` を変えるだけ | ゲートウェイ経由の遅延が僅かに増える | **任意で採用**（推奨） |
| Workers AI (Llama 等) | Cloudflare 内で完結、無料 10k neuron/日 | 要件が Gemini 指定。日本語の報連相文面の品質で劣る | フォールバック候補（C） |

## 4. 認証と GitHub 書き込み

| 候補 | メリット | デメリット | 判定 |
|---|---|---|---|
| **GitHub OAuth App（自前実装、`repo` スコープ）** | **ログインとリポジトリ書き込みをトークン 1 本で兼ねる**（今回の要件との最大のシナジー）。実装は 2 ルート。外部 IdP 不要 | `repo` スコープは広い。private リポジトリに書くには必要。public のみなら `public_repo` に絞れる（`GITHUB_OAUTH_SCOPE` で切替） | **採用** |
| GitHub App + Installation token | 権限を細かく絞れる | 個人利用でインストールフローが重い。JWT 署名の実装が増える | 将来の選択肢 |
| Cloudflare Access | 50 ユーザーまで無料で強い認証 | GitHub 書き込みトークンは別途必要になり、二重ログイン | 社内配布時に追加（C） |
| Clerk / Auth0 | 楽 | 外部サービス依存。GitHub トークンの取り回しが結局必要 | 不採用 |

## 5. 日次コミットのスケジューリング

| 候補 | メリット | デメリット | 判定 |
|---|---|---|---|
| **Cron Triggers（毎時）+ 冪等ジョブ** | 無料プランで使える。ユーザーごとのタイムゾーン/時刻に対応するため毎時起動し、`content_hash` で二重コミットを防ぐ | 1 回の実行に上限（無料: サブリクエスト 50）。ユーザー数が増えたらバッチ分割が必要 | **採用** |
| Workflows | ステップごとの再試行・状態が標準で付く。無料枠あり | 抽象が増える。現状のリトライ要件（翌時間に再実行）は D1 の status で足りる | 拡張プラン C |
| Queues | 非同期化に最適 | **Workers Paid 必須**（無料枠 MUST に反する） | 不採用 |
| GitHub Actions の schedule で API を叩く | Cloudflare 側の実装が減る | 公開エンドポイント＋認証が必要。Cloudflare 完結の要件に反する | 不採用 |

## 6. テスト・品質

| 候補 | メリット | デメリット | 判定 |
|---|---|---|---|
| **Vitest + `@cloudflare/vitest-pool-workers`** | workerd 上で D1 を実物で回せる。`applyD1Migrations` でスキーマも検証 | 起動が数秒。単体テストとは別 config に分ける必要 | **採用**（結合） |
| Vitest (node) + fetch モック | 数百 ms で回る。TDD の内側ループに最適 | Cloudflare 固有の挙動は検証できない | **採用**（単体） |
| **Biome** | lint + format が 1 ツール・高速・設定 1 ファイル | ESLint プラグイン資産は使えない | **採用** |
| ESLint + Prettier | 実績・プラグイン | 設定が 2 系統、遅い | 不採用 |

## 7. リポジトリ構成

| 候補 | メリット | デメリット | 判定 |
|---|---|---|---|
| **単一パッケージ + フォルダ境界（`src/core` / `src/server` / `src/client`）** | ルートで `pnpm dev` / `pnpm verify` が動き、新しく参加する人が迷わない。`tsconfig.core.json`（`types: []`）で core の純粋性を型レベルで保証できる | 依存を「パッケージ」で分離できない（フォルダと tsconfig で代替） | **採用**（[ADR-0005](adr/0005-flatten-to-single-package.md)） |
| pnpm workspace（`packages/core` + `apps/web`） | 依存の分離が強い。パッケージ単位の並行開発 | `--filter` や `workspace:*` の作法が増え、この規模では手数が価値を上回る | 不採用（v0.1 で採用 → v0.2 で平坦化） |
| Turborepo / Nx | キャッシュ | この規模では過剰 | 不採用（後から足せる） |

## 8. ローカル開発環境

要件は「環境依存を避ける」。ホストに Node.js / pnpm / workerd のバージョン差があっても同じ結果になることを最優先にした。

| 候補 | メリット | デメリット | 判定 |
|---|---|---|---|
| **Docker Compose（`Dockerfile` の dev ステージ + `compose.yaml`）** | ホストに Node.js を入れなくても動く。Node・pnpm・workerd がコードで固定される。**CI とデプロイで同じイメージを使える** | 初回のイメージビルドに時間がかかる。バインドマウントのファイル監視が macOS/Windows で遅い（polling で回避） | **採用**（[ADR-0007](adr/0007-docker-for-local-dev.md)） |
| Dev Container（`devcontainer.json`） | エディタ統合が最良。同じ `Dockerfile` を再利用できる | VS Code / Cursor に依存し、CLI だけで完結しない | 併用可（後から `Dockerfile` を指すだけで足せる） |
| mise / asdf でホストに直接インストール | 起動が速い。Docker 不要 | ホスト OS の差が残り、要件を満たさない | 不採用（Docker が使えない場合の代替として `docs/dev/setup.md` に残す） |
| Nix (flake) | 再現性は最も強い | 学習コストが高く、チームに広げにくい | 不採用 |

### なぜこの Cloudflare 構成が Docker と相性が良いか

| Cloudflare プリミティブ | 無料枠 | Docker でローカル再現 | 備考 |
|---|---|---|---|
| Workers（Hono） | ○ | ◎ workerd がそのまま動く | ベースイメージは glibc 必須（alpine 不可） |
| Workers Static Assets | ○ | ◎ Vite の統合プラグイン | |
| D1 | ○ | ◎ `.wrangler/state` に SQLite 実体 | named volume で永続化 |
| Cron Triggers | ○ | ○ `--test-scheduled` で手動発火 | |
| AI Gateway | ○ | × リモート専用 | `GEMINI_FAKE=1` で迂回 |
| Queues | ×（有料） | － | そもそも不採用（§5） |
| Durable Objects | ○ | ◎ | 拡張プラン用 |

**追加コンテナが 1 つも要らない**のがこの構成の強み。PostgreSQL や Redis を選んでいたら compose に DB サービスと初期化スクリプトが増えていた。
外部 API だけはローカル再現できないため、Gemini には `GEMINI_FAKE=1`（`src/server/lib/gemini-fake.ts`）を用意し、API キー無し・オフラインでも一連の流れを試せるようにした。GitHub API は製品価値そのものなので本物を使う。

## 9. CI/CD の実行環境

| 候補 | メリット | デメリット | 判定 |
|---|---|---|---|
| **同じ Docker イメージ内で `pnpm verify` → `wrangler deploy`** | ローカル・CI・デプロイが同一環境。`Dockerfile` 自体も毎 PR で検証される。デプロイするのは検証したのと同じイメージの成果物 | 単一ジョブなので並列化を捨てる（約 2〜3 分）。イメージビルドの待ちが乗る | **採用**（[ADR-0008](adr/0008-run-ci-inside-dev-image.md)） |
| runner に直接 setup-node + pnpm（v0.2 まで） | 起動が速く、ジョブを並列に分けられる | ローカル（Docker）と環境が違い、差分が CI をすり抜ける | 不採用 |
| イメージを GHCR に push し、各ジョブが `container:` で使う | 並列化と環境一致を両立できる | レジストリの権限運用と、初回の鶏と卵問題 | 規模が増えたら移行（拡張プラン） |
| セルフホストランナー | 実行時間の制約が無い | 管理コスト。無料枠で完結させる方針に合わない | 不採用 |

## 10. 無料枠チェックリスト（デプロイ前に確認）

- [ ] Workers Free: 100k req/日、CPU 10ms/req、バンドル 3MB（圧縮）
- [ ] D1: 5GB、5M 行読/日、100k 行書/日
- [ ] Cron Triggers: Free で利用可（アカウント単位の上限あり）
- [ ] Gemini API 無料枠: モデルごとの RPM/RPD。AI Gateway でレート制限を設定
- [ ] GitHub Actions: public リポジトリは無制限、private は 2,000 分/月
- [ ] GitHub API: 認証済み 5,000 req/時
- [ ] Docker Hub: 匿名 pull のレート制限（CI が共有 IP から `node:22-bookworm-slim` を取りに行く）。連続で失敗するようなら `docker/login-action` でログインする

上限値は 2026-09 時点の把握。**公式の料金ページを PR 前に再確認する**（変わりやすい）。
