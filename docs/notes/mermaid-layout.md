# Mermaid で文言がぶつかるときの直し方

- いつ読むか: GitHub 上の図でラベルが重なって読めないとき。
- 結論: **自己ループを消す・長いラベルは note に逃がす・1 図に状態機械を 2 つ入れない**。

## 定石

| 症状 | 直し方 |
|---|---|
| stateDiagram の自己ループ（`A --> A: ...`）のラベルが隣と重なる | 自己ループを消し、`note right of A` に説明を書く |
| 遷移ラベルが長くて折り返す | ラベルは 6〜10 文字に。詳細は note か本文の表へ |
| 縦に長すぎて全体が見えない | `direction LR` で横に。ノードが 5 個を超えたら図を分ける |
| 1 つの図に独立した状態機械が 2 つある | 図を 2 つに分ける（複合 state で囲っても配置は改善しない） |
| flowchart の subgraph 内でノードが密集する | subgraph ごとに `direction TB` を指定。矢印のラベルは短く |

## 確認方法

GitHub にプッシュする前に、mermaid-cli で PNG にして目視する（依存は scratchpad か `npx` で。`pnpm add` しない）。

```bash
npx -y @mermaid-js/mermaid-cli -i diagram.mmd -o diagram.png -b white -w 900
```

## 関連
- 元になった学び: 2026-09-18（`.claude/MEMORY.md`）。実例は `docs/design-docs/02-business-flow.md` 2-4
