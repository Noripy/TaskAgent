---
paths:
  - "packages/core/**"
---
# packages/core のルール
- 依存は `zod` のみ。`fetch`・`Date.now()`・`crypto.randomUUID()`・Cloudflare API を呼ばない（引数で受け取る）。
- 変更は必ず `packages/core/test` のテストとセットで。Markdown 描画はインラインスナップショットで固定する。
- プロンプト文字列は「安定部分を先頭、可変部分（日付・入力）を末尾」に置く。LLM 側のキャッシュ効率のため。
- スキーマの制約値（15 分、質問 2 個 × 3 回）は定数として export し、プロンプトとテストの両方で参照する。
