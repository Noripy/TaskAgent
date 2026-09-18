#!/usr/bin/env bash
# 並行開発用: 機能ごとに git worktree を切って、別ターミナル / 別 Claude Code セッションで同時に進める。
#   scripts/worktree.sh add  feat-memo-mood     # ../TaskAgent.wt/feat-memo-mood に作成 & 依存インストール
#   scripts/worktree.sh rm   feat-memo-mood
#   scripts/worktree.sh ls
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
WT_DIR="${ROOT}.wt"
cmd="${1:-ls}"; name="${2:-}"
case "$cmd" in
  add)
    [ -n "$name" ] || { echo "usage: $0 add <branch>"; exit 1; }
    mkdir -p "$WT_DIR"
    git -C "$ROOT" fetch origin main >/dev/null 2>&1 || true
    git -C "$ROOT" worktree add -b "$name" "$WT_DIR/$name" origin/main 2>/dev/null || git -C "$ROOT" worktree add "$WT_DIR/$name" "$name"
    (cd "$WT_DIR/$name" && pnpm install --frozen-lockfile)
    [ -f "$ROOT/.dev.vars" ] && cp "$ROOT/.dev.vars" "$WT_DIR/$name/.dev.vars"
    echo "ready: cd $WT_DIR/$name && claude"
    ;;
  rm)
    [ -n "$name" ] || { echo "usage: $0 rm <branch>"; exit 1; }
    git -C "$ROOT" worktree remove "$WT_DIR/$name" --force
    ;;
  ls) git -C "$ROOT" worktree list ;;
  *) echo "usage: $0 {add|rm|ls} [branch]"; exit 1 ;;
esac
