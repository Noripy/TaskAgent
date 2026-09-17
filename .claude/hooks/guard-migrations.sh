#!/usr/bin/env bash
# PreToolUse: 適用済みマイグレーションの書き換えと、秘密ファイルへの書き込みをブロックする（exit 2 = ブロック）。
set -euo pipefail
file="$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write((j.tool_input&&j.tool_input.file_path)||"")}catch{}})')"
[ -z "$file" ] && exit 0
case "$file" in
  */migrations/[0-9]*.sql)
    if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
      echo "BLOCK: 既存マイグレーション $file は編集禁止。新しい番号のファイルを追加してください。" >&2
      exit 2
    fi
    ;;
  *.dev.vars|*/.env|*/.env.*|.env|.env.*)
    echo "BLOCK: 秘密ファイル $file への書き込みは禁止。" >&2
    exit 2
    ;;
esac
exit 0
