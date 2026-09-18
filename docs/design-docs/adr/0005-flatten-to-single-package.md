# ADR-0005: pnpm workspace をやめ、単一パッケージ + フォルダ境界にする

- 状態: Accepted
- 日付: 2026-09-18
- 置き換え: ADR-0002 の「リポジトリ構成」部分

## 文脈
v0.1 は `packages/core` と `apps/web` の pnpm workspace だった。旧リポジトリの `task-agent/` サブディレクトリと同様に、アプリがルートに無いことで `cd` や `--filter` が必要になり、新しく参加する人（およびエージェント）の手数が増えていた。

## 決定
アプリをリポジトリ直下に置き、`src/core` / `src/server` / `src/client` のフォルダで境界を引く。
`src/core` の「Cloudflare・DOM・React に依存しない」という制約は、`tsconfig.core.json`（`types: []`、`lib: ES2022` のみ）で型レベルに保証する。テストは `test/core` / `test/unit` / `test/workers` に分ける。

## 結果
- 良い: ルートで `pnpm dev` / `pnpm verify` が動く。import は相対パス 1 種類。CI の手順が短い。
- 悪い: パッケージ単位の依存分離は無い。core に外部ライブラリを足すときは `package.json` を共有するので、レビューで気をつける。
