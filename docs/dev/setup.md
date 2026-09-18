# セットアップとデプロイ

## 1. ローカル

```bash
corepack enable && corepack prepare pnpm@10.33.0 --activate
pnpm install
cp .dev.vars.example .dev.vars
```

`.dev.vars` を埋める:

1. **GitHub OAuth App**: GitHub → Settings → Developer settings → OAuth Apps → New。
   - Homepage: `http://localhost:5173`
   - Callback: `http://localhost:5173/api/auth/callback`
   - Client ID / Secret を `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` に。
2. **Gemini**: [Google AI Studio](https://aistudio.google.com/) → Get API key → `GEMINI_API_KEY`。
3. `TOKEN_ENCRYPTION_KEY=$(openssl rand -base64 32)`、`SESSION_SECRET=$(openssl rand -hex 32)`。

```bash
pnpm db:migrate:local   # ローカル D1 にスキーマ適用
pnpm dev                # Vite + Worker 統合開発サーバー http://localhost:5173
```

メモの保存先リポジトリを GitHub 上で作っておく（private 推奨、空で OK）。アプリの「設定」で owner / repo を入れて保存すると push 権限を確認する。

## 2. 本番（Cloudflare）

本番は **Terraform（D1・AI Gateway）+ wrangler（Worker）** で構築する。チェックリスト付きの手順書は `docs/ops/cloudflare-setup.md`。以下は最短の要約:

```bash
# 1) 状態を持つリソースを Terraform で作る（state は R2）
cd infra/terraform
cp backend.hcl.example backend.hcl && cp terraform.tfvars.example terraform.tfvars   # 値を埋める
terraform init -backend-config=backend.hcl && terraform apply
cd ../..

# 2) D1 の database_id を wrangler.jsonc に反映してコミット
pnpm infra:sync
pnpm db:migrate:remote

# 3) アプリの Secrets（.dev.vars と同じキー）
pnpm exec wrangler login
for k in GITHUB_CLIENT_ID GITHUB_CLIENT_SECRET GEMINI_API_KEY TOKEN_ENCRYPTION_KEY SESSION_SECRET; do
  pnpm exec wrangler secret put $k
done
```

本番用の GitHub OAuth App は別に作り、Callback を `https://taskagent.<subdomain>.workers.dev/api/auth/callback` にする。

デプロイ:

```bash
pnpm deploy            # 手動
# または main へのマージで .github/workflows/deploy.yml が実行される
```

GitHub Actions からデプロイする場合、リポジトリの Secrets に `CLOUDFLARE_API_TOKEN`（Workers Scripts:Edit, D1:Edit）と `CLOUDFLARE_ACCOUNT_ID` を登録する。

## 3. 任意: AI Gateway

Cloudflare ダッシュボード → AI → AI Gateway → ゲートウェイ作成。`.dev.vars` / Secret に

```
GEMINI_BASE_URL=https://gateway.ai.cloudflare.com/v1/<ACCOUNT_ID>/<GATEWAY>/google-ai-studio
```

を入れるだけで、キャッシュ・ログ・レート制限が付く。

## 4. 動作確認のコマンド

```bash
curl -s http://localhost:5173/api/health           # {"ok":true,"env":"development"}
pnpm exec wrangler d1 execute taskagent-db --local --command "select count(*) from memos"
```

Cron をローカルで叩く: `pnpm exec wrangler dev --test-scheduled` を起動し、`curl "http://localhost:8787/__scheduled?cron=0+*+*+*+*"`。
