# 用語集

| 用語 | 意味 | コード上の対応 |
|---|---|---|
| キャプチャ (capture) | 利用者が投げた生の入力。対話の起点 | `captures` テーブル |
| ラリー / ラウンド | Gemini からの質問と利用者の回答の往復。最大 3 回 | `captures.round`, `conversation_turns` |
| メモ (memo) | 構造化された記録。事実 / Keep / Try / 最初の一歩 / 報連相 | `MemoSchema`, `memos` |
| Keep / Try | 振り返り手法 KPT の要素。Problem は書かない（自責に寄りやすいため） | `memo.keep`, `memo.try` |
| 最初の一歩 (next_action) | 15 分以内に着手できる行動 | `NextActionSchema` |
| 報連相 (horenso) | 報告・連絡・相談。相手に送れる下書きを含む | `HorensoSchema` |
| 伝え方 (communication) | 言った表現 / 言い換え / 使える語彙 / コツ 1 つ。語彙力と伝え方を育てる観点 | `CommunicationSchema` |
| おつかれモード | 文字を大きく、行間を広げ、二次情報を隠す表示モード | `html[data-mode=calm]`, `.ta-secondary` |
| ダイジェスト (digest) | 1 日分のメモと振り返りをまとめた Markdown | `daily_digests`, `renderDailyDigest` |
| インサイト (insight) | 日次の「良かったこと 3 / 明日の一歩 3 / ひとこと」 | `InsightSchema` |
| Deps | fetch / 時刻 / ID 生成を差し替えるための依存の束 | `src/server/env.ts` |
| AI-DLC | AI-Driven Development Life Cycle。AI エージェントが実装の主役になる前提の開発サイクル | `docs/dev/ai-dlc.md` |
| Harness Engineering | エージェントが安全に速く動けるよう、検証コマンド・権限・フックなど「足場」を整える工学 | `.claude/`, `pnpm verify` |
| Loop Engineering | 「変更 → 検証 → 修正」のループを短く・自動で回るように設計すること | `pnpm test:unit`, CI |
| KISS | Keep It Simple, Stupid。必要以上の仕組みを入れない | `docs/notes/design-principles.md` |
| PIE | Program Intently and Expressively。名前と構造で意図を語らせる | 同上 |
| SLAP | Single Level of Abstraction Principle。1 関数の中で抽象度を揃える | 同上 |
| OCP | Open-Closed Principle。拡張に開き、修正に閉じる | 同上 |
| dev イメージ | `Dockerfile` の `dev` / `ci` ステージ。ローカル・CI・デプロイで共有する実行環境 | `Dockerfile`, `compose.yaml` |
| フェイク LLM | `GEMINI_FAKE=1` のとき使う、ネットワーク不要の決定的な Gemini 代替 | `src/server/lib/gemini-fake.ts` |
| 学びの台帳 (MEMORY.md) | 運用中のハマりを記録し、hooks / rules / settings / CLAUDE.md / notes へ昇格するための表 | `.claude/MEMORY.md`, `/learn` |
| 備考 (notes) | 日常の開発・構築で必要なノウハウ集。1 テーマ 1 ファイル | `docs/notes/` |
| IaC | Infrastructure as Code。Cloudflare の D1・AI Gateway を Terraform で管理する | `infra/terraform/` |
| Progressive Disclosure | 必要なときに必要な情報だけ出す。CLAUDE.md を短く保ち、詳細は rules/skills に分ける | `.claude/rules/*.md` |
