# MEMORY.md — 運用中の学びの台帳

このファイルは「一度ハマったことを二度と踏まない」ための台帳。**読むだけのメモにせず、必ずガードレールへ昇格させる**。

- 追記のタイミング: CI が落ちた原因が分かったとき / 権限プロンプトが繰り返されたとき / 同じ指摘を 2 回受けたとき / ライブラリの落とし穴を踏んだとき
- 昇格先の選び方（`/learn` スキルが手順を持つ）:
  | 学びの種類 | 昇格先 |
  |---|---|
  | 「〜してはいけない」を機械的に止められる | `.claude/hooks/*.sh`（PreToolUse / Stop） |
  | 特定フォルダを触るときの判断基準 | `.claude/rules/*.md` |
  | 毎回聞かれる安全なコマンド / 触ってはいけないファイル | `.claude/settings.json` の allow / deny（個人限定なら `settings.local.json`） |
  | コマンド名・フォルダ構成・開発ルールそのもの | `CLAUDE.md` |
  | 手順や背景知識（人も読む） | `docs/notes/`（備考） |
- 状態は `未反映` → `反映済` の 2 つだけ。`未反映` が残ったまま作業を終えようとすると Stop フックが差し戻す。

| 日付 | 学び | 昇格先 | 状態 |
|---|---|---|---|
| 2026-09-17 | `wrangler.jsonc` の `compatibility_date` が同梱 workerd より新しいと `vitest-pool-workers` が起動しない | `docs/notes/cloudflare-free-tier-gotchas.md` | 反映済 |
| 2026-09-17 | `@cloudflare/vitest-pool-workers` 0.22 は `defineWorkersConfig` ではなく `cloudflareTest()` プラグイン。`Env` は `Cloudflare.Env` 名前空間 | `docs/notes/cloudflare-free-tier-gotchas.md` | 反映済 |
| 2026-09-17 | Biome は Tailwind の `@theme` / `@apply` を既定で拒否する（`css.parser.tailwindDirectives`） | `biome.json`, `.claude/rules/client.md` | 反映済 |
| 2026-09-17 | Hono RPC は `.get().post()` のメソッドチェーンでないと型が付かない | `.claude/rules/server.md` | 反映済 |
| 2026-09-18 | `tsconfig` の `extends` が壊れると `tsc` が `noEmit` を失って `.js` を吐き出す | `scripts/check-claude-md.mjs`（構成ズレ検知）, `docs/notes/claude-code-memory.md` | 反映済 |
| 2026-09-18 | Mermaid stateDiagram の自己ループはラベルが隣と重なる。注記に逃がす | `docs/notes/mermaid-layout.md`, `.claude/rules/docs.md` | 反映済 |
| 2026-09-18 | 誤って `pnpm add` するとルートの `package.json` が汚れる。検証用ツールは scratchpad に入れる | `.claude/rules/tooling.md` | 反映済 |
| 2026-09-18 | サンドボックスでは registry.terraform.io が遮断され `terraform validate` が動かない。provider v5 の属性名は CI（infra.yml）の validate で確認する | `docs/notes/terraform-iac.md` | 反映済 |
