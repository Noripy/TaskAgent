#!/usr/bin/env bash
# Stop: 作業を終える前に「学びの未反映」と「CLAUDE.md の構成ズレ」を検査する。
# 問題があれば exit 2 で差し戻し、Claude が自律的に直してから終了する。
# stop_hook_active=true（差し戻し後の再停止）では無限ループを避けるため検査しない。
set -uo pipefail
input="$(cat)"
active="$(printf '%s' "$input" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(String(JSON.parse(s).stop_hook_active===true))}catch{process.stdout.write("false")}})')"
[ "$active" = "true" ] && exit 0
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

problems=""
if git diff --quiet -- .claude/MEMORY.md 2>/dev/null && git diff --cached --quiet -- .claude/MEMORY.md 2>/dev/null; then
  :
else
  if grep -E '^\|' .claude/MEMORY.md | grep -q '未反映'; then
    problems+="- .claude/MEMORY.md に「未反映」の学びがあります。/learn の手順で rules / hooks / settings / CLAUDE.md / docs/notes のいずれかへ反映し、状態を「反映済」にしてください。\n"
  fi
fi
if ! out="$(node scripts/check-claude-md.mjs 2>&1)"; then
  problems+="- CLAUDE.md / .claude/rules の記述が実体とズレています。次を直してから終了してください:\n$out\n"
fi
if [ -n "$problems" ]; then
  printf '%b' "$problems" >&2
  exit 2
fi
exit 0
