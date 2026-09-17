---
name: pr-ready
description: PR を出す前の最終チェック。verify 実行、差分の自己レビュー、コミットメッセージ案の作成までを一括で行う。
---
# PR 前チェック

1. `pnpm verify` を実行。失敗したら直してから先へ。
2. `git diff origin/main...HEAD` を読み、次を自問する:
   - テストのない振る舞い変更はないか
   - `docs/design-docs` の更新が必要な変更はないか（`/design-sync`）
   - 秘密情報・個人情報が入っていないか
   - `.claude/rules/*.md` に反していないか
3. コミットは関心事ごとに分ける。メッセージは「何を・なぜ」を 1 行目 72 字以内で。
4. PR 本文は `.github/pull_request_template.md` に沿う。
