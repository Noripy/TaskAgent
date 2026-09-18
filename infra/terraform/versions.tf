terraform {
  required_version = ">= 1.9.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  # state は Cloudflare R2（S3 互換・無料枠 10GB）に置く。接続情報は backend.hcl（git 管理外）で渡す:
  #   terraform init -backend-config=backend.hcl
  backend "s3" {}
}

# 認証は環境変数 CLOUDFLARE_API_TOKEN（D1:Edit, AI Gateway:Edit, Workers R2 Storage:Edit）
provider "cloudflare" {}
