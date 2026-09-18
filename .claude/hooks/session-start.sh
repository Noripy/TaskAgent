#!/usr/bin/env bash
# SessionStart: 未反映の学びと、個人設定にだけある許可を提示する（Claude が自律的に昇格を始めるための入口）。
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
pending="$(grep -E '^\|' .claude/MEMORY.md 2>/dev/null | grep '未反映' || true)"
if [ -n "$pending" ]; then
  echo "== MEMORY.md に未反映の学びがあります。作業開始前に /learn で昇格先へ反映してください =="
  echo "$pending"
fi
if [ -f .claude/settings.local.json ]; then
  extra="$(node -e '
    const fs=require("fs");
    const j=p=>{try{return JSON.parse(fs.readFileSync(p,"utf8"))}catch{return {}}};
    const shared=new Set(((j(".claude/settings.json").permissions||{}).allow)||[]);
    const local=((j(".claude/settings.local.json").permissions||{}).allow)||[];
    console.log(local.filter(x=>!shared.has(x)).join("\n"));
  ' 2>/dev/null)"
  if [ -n "$extra" ]; then
    echo "== settings.local.json にだけある allow（汎用的なら settings.json へ昇格を検討） =="
    echo "$extra"
  fi
fi
exit 0
