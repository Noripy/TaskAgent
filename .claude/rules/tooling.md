---
paths:
  - "package.json"
  - "pnpm-lock.yaml"
  - "scripts/**"
  - ".claude/**"
---
# ツールと設定のルール
- 検証用の一時ツール（Playwright、mermaid-cli など）は `pnpm add` しない。scratchpad か `npx` で使い、`package.json` を汚さない。
- 依存の追加は専用の PR に分ける（`pnpm-lock.yaml` の競合を避ける）。
- `.claude/hooks/*.sh` を変えたら、サンプル JSON を流して exit code を確認してからコミットする。
- `.claude/settings.local.json` は個人用。共有すべき allow / deny は `settings.json` に昇格する（`/learn`）。
- 学びは `.claude/MEMORY.md` に記録し、「未反映」のまま終えない。
