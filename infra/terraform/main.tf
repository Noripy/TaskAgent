# TaskAgent の「状態を持つ」Cloudflare リソースを Terraform で管理する。
# Worker 本体（ビルド成果物）は wrangler deploy（CI）が担当。分担の理由は docs/design-docs/adr/0006-terraform-for-stateful-resources.md。

locals {
  suffix = var.environment == "production" ? "" : "-${var.environment}"
}

# D1（SQLite）。作成後の database_id を wrangler.jsonc に反映する: pnpm infra:sync
resource "cloudflare_d1_database" "main" {
  account_id = var.cloudflare_account_id
  name       = "${var.d1_database_name}${local.suffix}"

  lifecycle {
    prevent_destroy = true # データを持つので誤 destroy を止める
  }
}

# AI Gateway（任意）。GEMINI_BASE_URL をここに向けるとキャッシュ・ログ・レート制限が付く。
resource "cloudflare_ai_gateway" "gemini" {
  count = var.ai_gateway_enabled ? 1 : 0

  account_id                 = var.cloudflare_account_id
  id                         = "taskagent${local.suffix}"
  cache_invalidate_on_update = true
  cache_ttl                  = 0
  collect_logs               = true
  rate_limiting_interval     = 60
  rate_limiting_limit        = var.ai_gateway_rate_limit_per_minute
  rate_limiting_technique    = "sliding"
}
