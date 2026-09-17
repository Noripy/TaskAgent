# セットアップとデプロイ

## 1. ローカル

```bash
corepack enable && corepack prepare pnpm@10.33.0 --activate
pnpm install
cp apps/web/.dev.vars.example apps/web/.dev.vars
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

一度だけ:

```bash
pnpm --filter @taskagent/web exec wrangler login
pnpm --filter @taskagent/web exec wrangler d1 create taskagent-db
# 出力された database_id を apps/web/wrangler.jsonc の d1_databases[0].database_id に貼る
pnpm db:migrate:remote

# アプリの Secrets（.dev.vars と同じキー）
for k in GITHUB_CLIENT_ID GITHUB_CLIENT_SECRET GEMINI_API_KEY TOKEN_ENCRYPTION_KEY SESSION_SECRET; do
  pnpm --filter @taskagent/web exec wrangler secret put $k
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
pnpm --filter @taskagent/web exec wrangler d1 execute taskagent-db --local --command "select count(*) from memos"
```

Cron をローカルで叩く: `pnpm --filter @taskagent/web exec wrangler dev --test-scheduled` を起動し、`curl "http://localhost:8787/__scheduled?cron=0+*+*+*+*"`。
