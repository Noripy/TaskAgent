---
name: tdd
description: 機能追加・バグ修正を TDD（Red → Green → Refactor）で進める。src/core / src/server / src/client の変更で、テストから書き始めたいときに使う。
---
# TDD で進める

引数: 変更内容の一言説明（例: `/tdd メモに「気分」フィールドを追加`）

手順:
1. **どの層か決める**。純粋ロジックなら `src/core`、I/O が絡むなら `src/server`。迷ったら core に寄せる。
2. **Red**: 失敗するテストを 1 つだけ書く。
   - core: `test/core/*.test.ts`
   - server 単体: `test/unit/*.test.ts`（fetch モック）
   - server 結合: `test/workers/*.test.ts`（`fakeExternal()` を使う）
   - 実行して **必ず失敗を確認**する: `pnpm test:unit`（結合は `pnpm test:workers`）
3. **Green**: テストが通る最小の実装を書く。設計を良くしようとしない。
4. **Refactor**: 重複を消す。テストは緑のまま。
5. 2〜4 を、要求を満たすまで小さく繰り返す。
6. 最後に `pnpm verify`。落ちたら直す。ドキュメント（ER 図・フロー図）への影響があれば同じ変更で更新する。

禁止:
- テストを後回しにして実装から書く
- 1 サイクルで複数の振る舞いを追加する
- 通らないテストを skip する
