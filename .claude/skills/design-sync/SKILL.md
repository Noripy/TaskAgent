---
name: design-sync
description: コードと docs/design-docs（構成図・業務フロー・ER 図）のズレを検出して更新する。テーブル・ルート・ジョブを追加/変更した後に使う。
---
# 設計ドキュメント同期

1. 差分を確認: `git diff --name-only origin/main...HEAD`
2. 次の対応表で、変更に該当する図を特定する:
   | 変更箇所 | 更新する図 |
   |---|---|
   | `migrations/*.sql` | `docs/design-docs/03-er-diagram.md` |
   | `src/server/routes/*`, `jobs/*` | `docs/design-docs/02-business-flow.md` |
   | `wrangler.jsonc`, 新しいバインディング/外部サービス | `docs/design-docs/01-architecture.md` |
   | 依存ライブラリの追加・置換 | `docs/design-docs/04-tech-selection.md` + ADR |
   | `infra/terraform/*.tf` | `docs/ops/cloudflare-setup.md`, `docs/notes/terraform-iac.md` |
   | `package.json` の scripts、`src/` 直下のフォルダ | `CLAUDE.md`（`pnpm check:docs` で確認） |
3. 図（Mermaid）を最小限で更新する。文章の言い換えはしない。
4. 変更点を 3 行以内で要約して報告する。
