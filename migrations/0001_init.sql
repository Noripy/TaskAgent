-- TaskAgent 初期スキーマ（D1 / SQLite）。ER 図: docs/design-docs/03-er-diagram.md
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id                TEXT PRIMARY KEY,
  github_id         INTEGER NOT NULL UNIQUE,
  login             TEXT NOT NULL,
  avatar_url        TEXT,
  encrypted_token   TEXT NOT NULL,          -- AES-GCM で暗号化した GitHub アクセストークン
  repo_owner        TEXT,
  repo_name         TEXT,
  repo_branch       TEXT NOT NULL DEFAULT 'main',
  repo_path_prefix  TEXT NOT NULL DEFAULT 'notes',
  timezone          TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  digest_hour       INTEGER NOT NULL DEFAULT 21, -- 現地時刻で日次コミットする時刻
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- 生の入力（捨てないためのインボックス）
CREATE TABLE IF NOT EXISTS captures (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_text    TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('clarifying','finalized','abandoned')),
  round       INTEGER NOT NULL DEFAULT 0,  -- 質問ラリーの回数
  local_date  TEXT NOT NULL,               -- ユーザー現地の YYYY-MM-DD
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_captures_user_date ON captures(user_id, local_date);

-- 質問ラリーの往復
CREATE TABLE IF NOT EXISTS conversation_turns (
  id          TEXT PRIMARY KEY,
  capture_id  TEXT NOT NULL REFERENCES captures(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('assistant','user')),
  content     TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_turns_capture ON conversation_turns(capture_id, created_at);

-- 構造化メモ（Gemini の出力を検証済みで保存）
CREATE TABLE IF NOT EXISTS memos (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  capture_id  TEXT UNIQUE REFERENCES captures(id) ON DELETE SET NULL,
  local_date  TEXT NOT NULL,
  title       TEXT NOT NULL,
  memo_json   TEXT NOT NULL,               -- MemoSchema (packages/core) の JSON
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_memos_user_date ON memos(user_id, local_date);

-- 日次ダイジェスト（GitHub コミットの記録）
CREATE TABLE IF NOT EXISTS daily_digests (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_date    TEXT NOT NULL,
  insight_json  TEXT,                       -- InsightSchema の JSON
  content_hash  TEXT,                       -- 最後にコミットした本文の SHA-256（差分なしならスキップ）
  commit_sha    TEXT,
  repo_path     TEXT,
  status        TEXT NOT NULL CHECK (status IN ('pending','committed','failed')),
  last_error    TEXT,
  committed_at  TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  UNIQUE (user_id, local_date)
);
