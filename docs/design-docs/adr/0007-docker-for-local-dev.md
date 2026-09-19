# ADR-0007: ローカル開発環境を Docker に統一する

- 状態: Accepted
- 日付: 2026-09-19

## 文脈
ホストに直接 Node.js / pnpm を入れる方式では、OS・Node のマイナーバージョン・グローバル設定の差が「自分の PC では動く」を生む。
本プロジェクトは workerd（Cloudflare のローカルランタイム）という native バイナリに依存しており、環境差の影響を受けやすい。

## 決定
`Dockerfile`（`dev` ステージ）と `compose.yaml` を追加し、**ローカル開発の既定を Docker にする**。
ホストに必要なのは Docker だけ。`pnpm docker:dev` で開発サーバーが立ち上がる。

- ソースはバインドマウント（保存すると即 HMR）
- `node_modules` は named volume に隔離（ホストの OS/CPU 向けバイナリを持ち込まない）
- ローカル D1（`.wrangler`）も named volume で永続化
- ベースイメージは `node:22-bookworm-slim`（glibc）。**alpine は不可**（workerd が musl 非対応）
- Gemini はオフラインでも試せるよう `GEMINI_FAKE=1` のフェイク実装を用意した

## 代替案
- **Dev Container**: エディタ統合は優れるが VS Code 系に依存する。同じ `Dockerfile` を指すだけで後から追加できるので、今は入れない。
- **mise / asdf**: 速いが OS 差が残り、要件（環境依存を避ける）を満たさない。Docker が使えない場合の代替として手順だけ残す。
- **Nix**: 再現性は最強だが学習コストが高い。

## 結果
- 良い: セットアップが `cp .dev.vars.example .dev.vars` と `pnpm docker:dev` の 2 手になった。CI とデプロイでも同じイメージを使える。
- 悪い: 初回ビルドに数分かかる。依存を変えたら `pnpm docker:reset` で `node_modules` volume を作り直す必要がある（named volume はイメージ更新時に自動で入れ替わらない）。落とし穴は `docs/notes/docker-dev.md`。
