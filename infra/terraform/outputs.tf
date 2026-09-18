output "d1_database_id" {
  description = "wrangler.jsonc の d1_databases[0].database_id に入れる値（pnpm infra:sync で自動反映）"
  value       = cloudflare_d1_database.main.id
}

output "d1_database_name" {
  value = cloudflare_d1_database.main.name
}

output "ai_gateway_base_url" {
  description = "GEMINI_BASE_URL に設定する値（AI Gateway 無効時は null）"
  value       = var.ai_gateway_enabled ? "https://gateway.ai.cloudflare.com/v1/${var.cloudflare_account_id}/${cloudflare_ai_gateway.gemini[0].id}/google-ai-studio" : null
}
