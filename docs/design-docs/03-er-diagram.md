# 03. ER 図

D1（SQLite）。DDL は `apps/web/migrations/0001_init.sql`。ID はすべて UUID（TEXT）。時刻は ISO 8601 UTC 文字列、日付はユーザー現地の `YYYY-MM-DD`。

```mermaid
erDiagram
  users ||--o{ sessions : "has"
  users ||--o{ captures : "creates"
  users ||--o{ memos : "owns"
  users ||--o{ daily_digests : "has"
  captures ||--o{ conversation_turns : "has"
  captures |o--o| memos : "finalizes into"

  users {
    TEXT id PK
    INTEGER github_id UK "GitHub のユーザー ID"
    TEXT login
    TEXT avatar_url
    TEXT encrypted_token "AES-GCM 暗号化した OAuth トークン"
    TEXT repo_owner "コミット先リポジトリ"
    TEXT repo_name
    TEXT repo_branch "default main"
    TEXT repo_path_prefix "default notes"
    TEXT timezone "IANA, default Asia/Tokyo"
    INTEGER digest_hour "現地時刻 0-23, default 21"
    TEXT created_at
    TEXT updated_at
  }

  sessions {
    TEXT id PK "署名付き Cookie に入る"
    TEXT user_id FK
    TEXT expires_at
    TEXT created_at
  }

  captures {
    TEXT id PK
    TEXT user_id FK
    TEXT raw_text "生の入力（捨てない）"
    TEXT status "clarifying | finalized | abandoned"
    INTEGER round "質問ラリー回数 0-3"
    TEXT local_date "YYYY-MM-DD"
    TEXT created_at
    TEXT updated_at
  }

  conversation_turns {
    TEXT id PK
    TEXT capture_id FK
    TEXT role "assistant | user"
    TEXT content
    TEXT created_at
  }

  memos {
    TEXT id PK
    TEXT user_id FK
    TEXT capture_id FK "UNIQUE, nullable"
    TEXT local_date
    TEXT title
    TEXT memo_json "MemoSchema (packages/core) の JSON"
    TEXT created_at
    TEXT updated_at
  }

  daily_digests {
    TEXT id PK
    TEXT user_id FK
    TEXT local_date "UNIQUE(user_id, local_date)"
    TEXT insight_json "InsightSchema の JSON"
    TEXT content_hash "memosHash:contentHash（冪等性）"
    TEXT commit_sha
    TEXT repo_path
    TEXT status "pending | committed | failed"
    TEXT last_error
    TEXT committed_at
    TEXT created_at
    TEXT updated_at
  }
```

## `memo_json` の構造（`packages/core/src/memo.ts`）

```jsonc
{
  "title": "先輩レビュー",
  "summary": "資料の構成について指摘を受けた。",
  "facts": ["田中さんが 9/17 に構成順を変えるよう言った"],   // 誰が・何を・いつ
  "keep": ["指摘をその場でメモできた"],                       // 良かったこと
  "try": ["先に目次を見せる"],                                // 次に試すこと
  "next_actions": [{ "text": "目次案を 3 案書く", "minutes": 15, "due": "2026-09-19" }], // 15 分以内
  "people": ["田中さん"],
  "tags": ["資料"],
  "horenso": { "kind": "報告", "to": "田中さん", "draft": "構成を修正しました。..." }
}
```

JSON カラムにした理由: メモ構造はプロンプト改善で頻繁に変わる。列に正規化すると毎回マイグレーションが必要になる。検索は `local_date` と `title` の列で足りる。

## 設計上の決め事

- **`captures` と `memos` を分ける**: 「投げた」時点で保存し、対話の途中でブラウザを閉じても入力を失わない（ペルソナの「情報をロストする」への対策）。
- **`daily_digests.content_hash`**: Cron が毎時走っても、内容が変わらなければ GitHub に触らない。メモ追加後は同じファイルを更新コミットする。
- **トークンは暗号化**: D1 が漏れても GitHub トークンは `TOKEN_ENCRYPTION_KEY`（Worker Secret）なしでは復号できない。
