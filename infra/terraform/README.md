# infra/terraform

Cloudflare の「状態を持つ」リソース（D1、AI Gateway）を Terraform で管理する。Worker 本体は `wrangler deploy`（CI）。

```bash
cd infra/terraform
cp backend.hcl.example backend.hcl && cp terraform.tfvars.example terraform.tfvars   # 値を埋める
export CLOUDFLARE_API_TOKEN=...  AWS_ACCESS_KEY_ID=...  AWS_SECRET_ACCESS_KEY=...
terraform init -backend-config=backend.hcl
terraform plan
terraform apply
cd ../.. && pnpm infra:sync      # D1 の database_id を wrangler.jsonc に反映
```

手順書: `docs/ops/cloudflare-setup.md`。ノウハウ: `docs/notes/terraform-iac.md`。
