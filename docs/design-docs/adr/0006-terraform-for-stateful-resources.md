# ADR-0006: 状態を持つ Cloudflare リソースは Terraform、Worker は wrangler で管理する

- 状態: Accepted
- 日付: 2026-09-18

## 文脈
D1 や AI Gateway を手動で作ると、環境の複製・撤去・レビューができない。一方で Worker 本体は Vite のビルド成果物で、毎回アップロードが必要。

## 決定
- Terraform（provider v5）で D1 と AI Gateway を管理する。state は Cloudflare R2（S3 互換）に置く。
- Worker（コード・Cron・Static Assets）は `wrangler deploy`。D1 の ID は `pnpm infra:sync` で `wrangler.jsonc` に流し込む。
- Secrets は `wrangler secret put` のみ。Terraform の state に載せない。
- apply は手動（`workflow_dispatch`）。PR では plan だけ。

## 代替案
- 全部 Terraform: plan の差分が JS 全文になりレビュー不能。
- 全部 wrangler: 作成の事実がコードに残らない。
- Pulumi: 情報量で Terraform に劣る。

## 結果
- 良い: 環境の再現手順が `terraform apply` + `wrangler deploy` の 2 つに収まる。D1 は `prevent_destroy` で守られる。
- 悪い: R2 バケットと API トークンだけは手動で作る（鶏と卵）。Terraform の学習コスト。
