# ADR-0002: Next.js スキャフォールドを廃止し Hono + React (Vite) にする

- 状態: Accepted
- 日付: 2026-09-17

## 文脈
旧リポジトリは `create-next-app` の初期状態（ページ 1 枚・テスト 1 本）で、Vercel 前提の構成だった。

## 決定
Next.js を使わず、Cloudflare 公式の `@cloudflare/vite-plugin` で Hono（API）と React（SPA）を 1 Worker にまとめる。

## 理由
- OpenNext 経由の Next.js は Worker バンドルが肥大化し、無料枠の 3MB 上限に触れやすい。
- 本サービスに SSR / Server Actions の必然性がない。
- Hono RPC でクライアントまで API 型が通り、AI エージェントが型エラーで API のズレに気づける。

## 結果
旧 `task-agent/` ディレクトリは削除。旧 README の構築手順は本 ADR で置き換える。
