# 06. CI/CD パイプライン

**同じ Docker イメージを、ローカル開発・CI・デプロイの 3 箇所で使い回す**のがこの設計の芯。
「自分の PC では通ったのに CI で落ちる」「CI は通ったのに本番で動かない」を構造的に無くす。

## 全体像

```mermaid
flowchart TB
  subgraph LOCAL["① 開発者の PC（Docker だけあればよい）"]
    direction LR
    EDIT["エディタでソースを編集"] --> BIND["バインドマウント<br/>ホスト ↔ /app"]
    BIND --> APP["compose: app<br/>Dockerfile target=dev<br/>pnpm dev → Vite + workerd"]
    APP --> BROWSER["http://localhost:5173<br/>HMR"]
    APP -. "GEMINI_FAKE=1" .-> FAKE["フェイク LLM<br/>（オフライン・キー不要）"]
    APP --> LD1[("ローカル D1<br/>named volume .wrangler")]
  end

  subgraph CI["② GitHub Actions: CI（PR と main）"]
    direction LR
    BUILD["docker build --target=ci<br/>（GHA レイヤキャッシュ）"] --> VERIFY["docker run … pnpm verify"]
    VERIFY --> STEPS["lint → check:docs → typecheck<br/>→ unit → workers → build → size"]
  end

  subgraph CD["③ GitHub Actions: Deploy（main のみ）"]
    direction LR
    BUILD2["同じ ci イメージ"] --> V2["pnpm verify（最後のゲート）"]
    V2 --> MIG["pnpm db:migrate:remote"]
    MIG --> DEP["pnpm cf:deploy<br/>vite build && wrangler deploy"]
  end

  subgraph INFRA["④ GitHub Actions: Infra（infra/terraform 変更時）"]
    TF["terraform fmt → validate → plan<br/>apply は手動実行のみ"]
  end

  LOCAL -- "git push" --> CI
  CI -- "merge to main" --> CD
  CD --> CFW["Cloudflare Workers<br/>+ Static Assets + D1 + Cron"]
  INFRA --> CFR["Cloudflare D1 / AI Gateway<br/>（状態を持つリソース）"]
```

## イメージのステージ構成

`Dockerfile` は 4 ステージ。依存解決を独立させることで、ソースを変えただけでは `pnpm install` が再実行されない。

```mermaid
flowchart LR
  BASE["base<br/>node:22-bookworm-slim<br/>+ pnpm 10.33.0 + git/curl"] --> DEPS["deps<br/>pnpm install --frozen-lockfile<br/>（BuildKit キャッシュ）"]
  BASE --> DEV["dev<br/>node_modules を取り込み<br/>非 root・CMD pnpm dev"]
  BASE --> CIS["ci<br/>node_modules + ソースを焼き込み<br/>CMD pnpm verify"]
  DEPS --> DEV
  DEPS --> CIS
```

| ステージ | 使う場所 | ソースの持ち方 |
|---|---|---|
| `base` | 共通 | なし |
| `deps` | 中間層 | `package.json` と `pnpm-lock.yaml` だけ |
| `dev` | `compose.yaml`（app / verify / cli） | バインドマウント（保存即反映） |
| `ci` | GitHub Actions | イメージに焼き込み（再現性優先） |

ベースを Debian（glibc）にしているのは、Cloudflare のローカルランタイム **workerd が musl では動かない**ため。alpine に変えると `pnpm test:workers` が起動しない。

## ワークフロー一覧

| ファイル | 契機 | すること | 必要な Secrets |
|---|---|---|---|
| `.github/workflows/ci.yml` | PR / main への push | `ci` イメージをビルドし、その中で `pnpm verify` | なし |
| `.github/workflows/deploy.yml` | main への push / 手動 | verify → D1 マイグレーション → `wrangler deploy` | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| `.github/workflows/infra.yml` | `infra/terraform/**` の PR / 手動 | fmt → validate →（Secrets があれば）plan。apply は手動のみ | 上記 + `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` |

## 秘密情報の扱い

```mermaid
flowchart LR
  DV[".dev.vars<br/>ローカルのみ・git 管理外"] -. "バインドマウントで<br/>コンテナから読む" .-> APP["dev コンテナ"]
  GS["GitHub Secrets<br/>CLOUDFLARE_API_TOKEN 等"] --> GA["Actions のジョブ"]
  GA -- "docker run -e で 1 回だけ渡す" --> CIC["ci コンテナ"]
  WS["wrangler secret put<br/>（本番の GEMINI_API_KEY 等）"] --> CF["Cloudflare の Worker"]
```

守っている 3 つの約束:

1. **イメージに秘密を焼き込まない**。`.dev.vars` と `infra/terraform/*.tfvars` は `.dockerignore` で除外している。
2. **コンテナの環境変数に置かない**（ローカル）。wrangler が `.dev.vars` を直接読むので、`docker inspect` に値が出ない。
3. **本番の値は Cloudflare 側にだけ置く**。`wrangler secret put` で登録し、リポジトリにも Actions にも残さない。

## 失敗したときの見方

| 症状 | 最初に見る場所 |
|---|---|
| CI の `pnpm verify` が落ちた | ローカルで `pnpm docker:verify`。同じイメージなので同じ結果になるはず |
| ローカルでは通るのに CI で落ちる | `.dockerignore` で除外したファイルに依存していないか（`.git` や `dist` など） |
| Deploy が `database_id` で失敗 | `pnpm infra:sync` の結果が main に入っているか（`docs/ops/cloudflare-setup.md` 手順 4） |
| Deploy が `Missing bindings` で失敗 | `wrangler secret put` の登録漏れ（同 手順 5） |
| イメージの pull で失敗 | Docker Hub の匿名 pull レート制限。`docker/login-action` を足す |
