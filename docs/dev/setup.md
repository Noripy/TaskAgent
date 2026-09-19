# セットアップとデプロイ

## 1. ローカル開発（Docker・推奨）

必要なのは **Docker Desktop（または Docker Engine + Compose v2）だけ**。ホストに Node.js も pnpm も入れません。

```bash
cp .dev.vars.example .dev.vars   # 値を埋める（下記）
pnpm docker:dev                  # 初回はイメージのビルドで数分。以降は数秒
```

`docker compose up --build app` を直接叩いても同じです。起動したら <http://localhost:5173> を開きます。

### `.dev.vars` に入れる値

**最短で動かす（オフライン・API キー無し）**

```dotenv
GEMINI_FAKE=1
TOKEN_ENCRYPTION_KEY=<openssl rand -base64 32>
SESSION_SECRET=<openssl rand -hex 32>
GITHUB_CLIENT_ID=dummy
GITHUB_CLIENT_SECRET=dummy
APP_ENV=development
```

`GEMINI_FAKE=1` は Gemini を呼ばずフェイク応答を返します（`src/server/lib/gemini-fake.ts`）。
無料枠を消費せず、ネットワークが無くても「投げる → 質問 → メモ → 振り返り」を一通り試せます。**production では `assertEnv` が拒否します**。

**本物の API をつなぐ**

| 変数 | 取り方 |
|---|---|
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub → Settings → Developer settings → OAuth Apps → New。Homepage `http://localhost:5173`、Callback `http://localhost:5173/api/auth/callback` |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/) → Get API key。入れたら `GEMINI_FAKE` は消す |
| `TOKEN_ENCRYPTION_KEY` | `openssl rand -base64 32` |
| `SESSION_SECRET` | `openssl rand -hex 32` |

メモの保存先リポジトリを GitHub 上で作っておきます（private 推奨、空で OK）。アプリの「設定」で owner / repo を入れて保存すると push 権限を確認します。

### よく使うコマンド

```bash
pnpm docker:dev      # 開発サーバー（http://localhost:5173）
pnpm docker:verify   # CI とまったく同じ検証を手元で
pnpm docker:shell    # コンテナ内のシェル（wrangler や d1 を叩く）
pnpm docker:reset    # 依存を変えたとき node_modules volume を作り直す
```

D1 のマイグレーションはコンテナの中で実行します。

```bash
docker compose run --rm cli pnpm db:migrate:local
docker compose run --rm cli pnpm exec wrangler d1 execute taskagent-db --local --command "select count(*) from memos"
```

HMR が効かない（macOS / Windows でファイル変更が届かない）ときは、環境変数を付けて起動します。

```bash
VITE_USE_POLLING=1 pnpm docker:dev
```

その他の落とし穴は [docs/notes/docker-dev.md](../notes/docker-dev.md)。

## 2. ローカル開発（Docker を使わない場合）

Docker が使えない環境向けの代替です。Node.js 22 と pnpm 10 をホストに入れます。

```bash
corepack enable && corepack prepare pnpm@10.33.0 --activate
pnpm install
cp .dev.vars.example .dev.vars
pnpm db:migrate:local
pnpm dev
```

CI は Docker イメージの中で動くため、この方法では環境差が残ります。**PR の前に `pnpm docker:verify` を通してください**。

## 3. 本番（Cloudflare）

本番は **Terraform（D1・AI Gateway）+ wrangler（Worker）** で構築します。チェックリスト付きの手順書は [docs/ops/cloudflare-setup.md](../ops/cloudflare-setup.md)。以下は最短の要約:

```bash
# 1) 状態を持つリソースを Terraform で作る（state は R2）
cd infra/terraform
cp backend.hcl.example backend.hcl && cp terraform.tfvars.example terraform.tfvars   # 値を埋める
terraform init -backend-config=backend.hcl && terraform apply
cd ../..

# 2) D1 の database_id を wrangler.jsonc に反映してコミット
pnpm infra:sync
pnpm db:migrate:remote

# 3) アプリの Secrets（.dev.vars と同じキー。GEMINI_FAKE は登録しない）
pnpm exec wrangler login
for k in GITHUB_CLIENT_ID GITHUB_CLIENT_SECRET GEMINI_API_KEY TOKEN_ENCRYPTION_KEY SESSION_SECRET; do
  pnpm exec wrangler secret put $k
done
```

本番用の GitHub OAuth App は別に作り、Callback を `https://taskagent.<subdomain>.workers.dev/api/auth/callback` にします。

デプロイ:

```bash
pnpm cf:deploy      # 手動（pnpm deploy は pnpm の組み込みコマンドなので使えません）
# 通常は main へのマージで .github/workflows/deploy.yml が実行される
```

GitHub Actions からデプロイする場合、リポジトリの Secrets に `CLOUDFLARE_API_TOKEN`（Workers Scripts:Edit, D1:Edit）と `CLOUDFLARE_ACCOUNT_ID` を登録します。パイプラインの全体像は [06. CI/CD パイプライン](../design-docs/06-cicd-pipeline.md)。

## 4. 任意: AI Gateway

Cloudflare ダッシュボード → AI → AI Gateway → ゲートウェイ作成。`.dev.vars` / Secret に

```
GEMINI_BASE_URL=https://gateway.ai.cloudflare.com/v1/<ACCOUNT_ID>/<GATEWAY>/google-ai-studio
```

を入れるだけで、キャッシュ・ログ・レート制限が付きます。

## 5. 動作確認のコマンド

```bash
curl -s http://localhost:5173/api/health           # {"ok":true,"env":"development"}
```

Cron をローカルで叩く:

```bash
docker compose run --rm --service-ports cli pnpm exec wrangler dev --test-scheduled
curl "http://localhost:8787/__scheduled?cron=0+*+*+*+*"
```
