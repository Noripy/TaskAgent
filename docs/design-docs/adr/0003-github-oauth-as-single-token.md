# ADR-0003: 認証と GitHub 書き込みを GitHub OAuth のトークン 1 本で兼ねる

- 状態: Accepted
- 日付: 2026-09-17

## 決定
GitHub OAuth App（scope=`repo`）でログインし、そのアクセストークンを AES-GCM で暗号化して D1 に保存。日次コミットは Contents API で行う。

## 代替案
Cloudflare Access / Clerk でログイン + 別途 PAT 入力。→ 二重ログインになり、ペルソナ（設定が面倒だと使わない）に合わない。

## 結果
- `repo` スコープは広い。public のみで良ければ `GITHUB_OAUTH_SCOPE=public_repo`。
- トークンの復号鍵 `TOKEN_ENCRYPTION_KEY` は Worker Secret のみに置く。
