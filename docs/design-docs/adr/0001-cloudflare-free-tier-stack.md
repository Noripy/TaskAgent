# ADR-0001: Cloudflare 無料枠で完結するスタック

- 状態: Accepted
- 日付: 2026-09-17

## 文脈
個人開発で、金銭コストゼロを MUST とする。IaaS は Cloudflare に統一する。

## 決定
Workers（Hono）+ Workers Static Assets（React SPA）+ D1 + Cron Triggers を採用。Queues は Paid 必須のため使わない。LLM は Gemini API（AI Studio 無料キー）、任意で AI Gateway を挟む。

## 結果
- 良い: 月額 0 円。デプロイは `wrangler deploy` 1 コマンド。
- 悪い: Gemini 無料枠のレート制限が最初のボトルネック。Cron は毎時起動になり、ユーザー数が増えたらバッチ分割が必要。
