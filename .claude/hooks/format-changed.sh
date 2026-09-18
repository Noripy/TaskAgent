#!/usr/bin/env bash
# PostToolUse: 編集されたファイルだけ Biome で整形する（全体 lint を毎回回さずトークンと時間を節約）。
set -euo pipefail
file="$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write((j.tool_input&&j.tool_input.file_path)||"")}catch{}})')"
[ -z "$file" ] && exit 0
case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.jsonc|*.css)
    [ -f "$file" ] && pnpm exec biome check --write "$file" >/dev/null 2>&1 || true
    ;;
esac
exit 0
