variable "cloudflare_account_id" {
  description = "Cloudflare アカウント ID（ダッシュボード右下、または `wrangler whoami`）"
  type        = string
}

variable "environment" {
  description = "環境名。リソース名の接尾辞になる（production / staging）"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["production", "staging"], var.environment)
    error_message = "environment は production か staging。"
  }
}

variable "d1_database_name" {
  description = "D1 データベース名。wrangler.jsonc の database_name と一致させる"
  type        = string
  default     = "taskagent-db"
}

variable "ai_gateway_enabled" {
  description = "AI Gateway を作るか（無料。Gemini 呼び出しのキャッシュ・ログ・レート制限）"
  type        = bool
  default     = true
}

variable "ai_gateway_rate_limit_per_minute" {
  description = "AI Gateway の 1 分あたり上限。Gemini 無料枠（RPM）を超えないように守る"
  type        = number
  default     = 10
}
