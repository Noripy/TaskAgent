# 備考（notes）— 日常の開発・構築で必要なノウハウ集

「手順書ではないが、知らないと詰まる」ことを 1 テーマ 1 ファイルで蓄積する。
設計の判断は `docs/design-docs/adr/`、手順は `docs/ops/`、ここは**ノウハウと落とし穴**。

| ファイル | 内容 |
|---|---|
| [docker-dev.md](docker-dev.md) | Docker 開発の構成と落とし穴（glibc・volume・HMR・秘密の除外） |
| [parallel-development.md](parallel-development.md) | 並行開発の境界・worktree・衝突しやすい場所 |
| [terraform-iac.md](terraform-iac.md) | Terraform で Cloudflare を管理するときの考え方と落とし穴 |
| [cloudflare-free-tier-gotchas.md](cloudflare-free-tier-gotchas.md) | 無料枠・wrangler・vitest-pool-workers で踏んだ穴 |
| [mermaid-layout.md](mermaid-layout.md) | Mermaid で文言がぶつかるときの直し方 |
| [claude-code-memory.md](claude-code-memory.md) | 学びをガードレールに昇格する運用（MEMORY.md / hooks / settings.local.json） |
| [template.md](template.md) | 新しいノートの雛形 |

## 書き方

- ファイル名は英語ケバブケース、本文は日本語。
- 冒頭 3 行で「いつ読むか」「結論」を書く。長い背景は後ろ。
- 学び（`.claude/MEMORY.md`）から昇格してきたものは、日付と元の学びを最後に 1 行残す。
