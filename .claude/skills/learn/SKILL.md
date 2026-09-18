---
name: learn
description: 運用中に得た学び（CI の失敗原因、繰り返される権限プロンプト、ライブラリの落とし穴、同じ指摘）を MEMORY.md に記録し、ガードレール（hooks / rules / settings / CLAUDE.md / docs/notes）へ昇格する。
---
# 学びをガードレールに昇格する

引数: 学びの一言（例: `/learn wrangler の compatibility_date は workerd の日付以下にする`）

手順:
1. `.claude/MEMORY.md` の表に 1 行追記する（日付 / 学び / 昇格先は仮 / 状態 = 未反映）。
2. 昇格先を **1 つ** 決める。判断基準は MEMORY.md 冒頭の表。迷ったら「機械的に止められるか？」で決める。止められるならフック、止められないなら rules。
3. 反映する:
   - **hooks**: `.claude/hooks/*.sh` を編集し、`echo '{"tool_input":{"file_path":"..."}}' | bash .claude/hooks/xxx.sh; echo $?` でブロック（exit 2）と通過（exit 0）の両方を確認する。
   - **rules**: 該当する `.claude/rules/*.md` に 1〜2 行。長い説明は `docs/notes/` に書いてリンクする。
   - **settings**: 安全で全員に共通なら `.claude/settings.json` の allow / deny。自分だけなら `.claude/settings.local.json`（git 管理外）。
   - **CLAUDE.md**: コマンド・フォルダ構成・開発ルールが変わったときだけ。40〜60 行を維持し、詳細は他へ逃がす。
   - **docs/notes**: 手順や背景知識。`docs/notes/README.md` の索引にも 1 行足す。
4. `pnpm check:docs` を実行し、パスとコマンドの整合を確認する。
5. MEMORY.md の状態を「反映済」にし、昇格先の列を確定する。
6. 学びとガードレールを **同じコミット** に入れる（後で追跡できるように）。

やらないこと:
- MEMORY.md に書いただけで終える（Stop フックが差し戻す）
- CLAUDE.md に長文を足す
- テストを skip して回避する類の「学び」を記録する
