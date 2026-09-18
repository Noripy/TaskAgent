# Cloudflare 無料枠と開発ツールの落とし穴

- いつ読むか: `vitest-pool-workers` が起動しない、wrangler の型が合わない、無料枠の上限が気になるとき。
- 結論: 日付とバージョンの組み合わせを疑う。上限は 1 ユーザーあたりの消費を先に見積もる（`docs/design-docs/01-architecture.md`）。

## ローカル / テスト

| 症状 | 原因 | 直し方 |
|---|---|---|
| `This Worker requires compatibility date "X", but the newest date supported by this server binary is "Y"` | `wrangler.jsonc` の `compatibility_date` が、テスト用 workerd の対応日より新しい | `compatibility_date` を Y 以下にする |
| `Missing "./config" specifier in "@cloudflare/vitest-pool-workers"` | 0.22 系（Vitest 4）は `defineWorkersConfig` を廃止 | `import { cloudflareTest } from "@cloudflare/vitest-pool-workers"` を `plugins` に入れる |
| テストの `env` に `DB` が無い（型） | `cloudflare:test` の env は `Cloudflare.Env` 名前空間 | `declare global { namespace Cloudflare { interface Env extends Bindings {...} } }` |
| `Cannot find type definition file for '@cloudflare/workers-types/2023-07-01'` | v5 は日付付きサブパスを廃止 | `types: ["@cloudflare/workers-types"]` |
| DOM と Workers の型が衝突 | 同じ tsconfig に両方入れた | クライアント用 tsconfig を分け、必要な型だけ `import type` で持ち込む（`types/cf-globals.d.ts`） |
| Biome が CSS で parse error | Tailwind の `@theme` `@apply` | `css.parser.tailwindDirectives: true` |

## 無料枠（2026-09 時点。変わるので公式で再確認）

- Workers: 100k req/日、CPU 10ms/req、バンドル 3MB（gzip）。LLM 待ちは CPU を使わないので 10ms で足りる。
- D1: 5GB、読 5M 行/日、書 100k 行/日。
- KV は書 1,000/日で対話には足りない（不採用の理由）。
- Queues は有料プランのみ。
- Cron は無料で使えるが、1 実行のサブリクエスト上限（50）に注意。ユーザー数が増えたら分割。
- Gemini 無料枠は RPM/RPD 制限があり、入力がサービス改善に使われ得る。AI Gateway のレート制限で守り、UI で社外秘の注意を出す。

## 関連
- 元になった学び: 2026-09-17（`.claude/MEMORY.md`）
