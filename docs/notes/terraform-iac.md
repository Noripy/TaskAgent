# Terraform で Cloudflare を管理する

- いつ読むか: D1 や AI Gateway を作り直す・増やすとき。Terraform と wrangler のどちらで管理するか迷ったとき。
- 結論: **状態を持つもの（D1・AI Gateway・R2）は Terraform、デプロイ成果物（Worker）は wrangler**。secrets はどちらにも書かず `wrangler secret put`。

## 分担の考え方

| もの | 管理 | 理由 |
|---|---|---|
| D1 データベース | Terraform | 消えると困る。`prevent_destroy` で守れる。ID を wrangler.jsonc に流し込める |
| AI Gateway | Terraform | 設定値（レート制限・ログ）をコードで残したい |
| R2（state バケット） | 手動 1 回 | 鶏と卵（state を置く場所を state で管理できない） |
| Worker 本体 + Cron + Static Assets | wrangler | ビルド成果物を毎回アップロードする。Terraform でやると `workers_script` に JS を埋める形になり差分が読めない |
| Secrets | `wrangler secret put` | Terraform の state に平文で残るのを避ける |

代替案と不採用理由:
- **全部 Terraform**（`cloudflare_workers_script` で JS をアップロード）: plan の差分が JS の全文になり、レビュー不能。
- **全部 wrangler**（D1 も `wrangler d1 create`）: 作った事実がコードに残らず、環境を複製できない。
- **Pulumi**: TypeScript で書けて魅力的だが、Cloudflare の例と情報量は Terraform が多い。

## state を R2 に置く

Terraform の `s3` バックエンドは R2 の S3 互換 API で動く。`backend.hcl.example` の `skip_*` と `use_path_style` は AWS 固有の検証を止めるためで、全部必要。
state には D1 の ID などが入るので、バケットは公開しない。R2 API トークンはバケット限定で発行する。

## 落とし穴

- provider v5 は v4 と属性名が大きく違う。ネット上の例（v4）をそのまま貼らない。`terraform validate` で早めに確かめる。
- `terraform.tfvars` と `backend.hcl` は git 管理外（`.gitignore` 済み）。CI では `-backend-config=` と `TF_VAR_*` で渡す。
- `cloudflare_d1_database` を消すと中身も消える。`prevent_destroy` を外すのは PR で意図を書いてから。
- apply は CI からは手動（`workflow_dispatch`）のみ。PR では plan だけ出す。
- 既存の手動リソースを取り込むときは `terraform import`。作り直しはしない。
- Claude Code のリモート環境では registry.terraform.io に届かず `terraform validate` が動かない。`terraform fmt` までをローカルで、`validate` と `plan` は CI（`.github/workflows/infra.yml`）で確認する。

## 関連
- 手順: `docs/ops/cloudflare-setup.md`
- 判断: `docs/design-docs/adr/0006-terraform-for-stateful-resources.md`
