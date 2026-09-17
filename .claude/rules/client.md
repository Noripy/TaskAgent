---
paths:
  - "apps/web/src/client/**"
---
# apps/web/src/client のルール
- API 呼び出しは `src/client/api.ts` の `api`（`hc<AppType>`）経由。生の `fetch("/api/...")` は書かない。
- ルーティングは `App.tsx` の最小実装（capture / today / settings）。ライブラリ追加は要相談。
- コピーは日本語・敬体なし・短く。ユーザーを急かさない。「完璧でなくていい」「最初の一歩」を軸にする。
- 状態管理ライブラリは入れない。`useState` / `useEffect` で足りる規模を維持する。
- Tailwind v4。`@apply` は使わない（Biome の CSS パーサと相性が悪い）。
