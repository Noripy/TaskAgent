---
paths:
  - "docs/**"
  - "README.md"
  - "infra/**"
---
# ドキュメントのルール
- 図は Mermaid（GitHub で描画される）。画像ファイルは追加しない。
- 仕様変更（テーブル追加、ルート追加、フロー変更）は同じ PR で `docs/design-docs/` の該当図を更新する。
- 技術選定の変更は `docs/design-docs/adr/` に ADR を 1 枚追加する（既存 ADR は書き換えず、Superseded にする）。
- 用語は `docs/product/glossary.md` に揃える。
- Mermaid の stateDiagram で自己ループを書かない（ラベルが重なる）。説明は `note` に。詳細は `docs/notes/mermaid-layout.md`。
- ノウハウは `docs/notes/`（備考）に 1 テーマ 1 ファイル。索引 `docs/notes/README.md` にも足す。手順書は `docs/ops/`。
