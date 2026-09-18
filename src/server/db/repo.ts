import type { Insight, Memo } from "../../core/index.js";

/**
 * D1 アクセス層。SQL はここに閉じ込め、ルート/サービスは型付き関数だけを使う。
 */
export interface UserRow {
  id: string;
  github_id: number;
  login: string;
  avatar_url: string | null;
  encrypted_token: string;
  repo_owner: string | null;
  repo_name: string | null;
  repo_branch: string;
  repo_path_prefix: string;
  timezone: string;
  digest_hour: number;
  created_at: string;
  updated_at: string;
}

export interface CaptureRow {
  id: string;
  user_id: string;
  raw_text: string;
  status: "clarifying" | "finalized" | "abandoned";
  round: number;
  local_date: string;
  created_at: string;
  updated_at: string;
}

export interface TurnRow {
  id: string;
  capture_id: string;
  role: "assistant" | "user";
  content: string;
  created_at: string;
}

export interface MemoRow {
  id: string;
  user_id: string;
  capture_id: string | null;
  local_date: string;
  title: string;
  memo_json: string;
  created_at: string;
  updated_at: string;
}

export interface DigestRow {
  id: string;
  user_id: string;
  local_date: string;
  insight_json: string | null;
  content_hash: string | null;
  commit_sha: string | null;
  repo_path: string | null;
  status: "pending" | "committed" | "failed";
  last_error: string | null;
  committed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function createRepo(db: D1Database) {
  return {
    // ---- users
    async findUserById(id: string) {
      return db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
    },
    async findUserByGithubId(githubId: number) {
      return db.prepare("SELECT * FROM users WHERE github_id = ?").bind(githubId).first<UserRow>();
    },
    async upsertUserFromGithub(input: {
      id: string;
      github_id: number;
      login: string;
      avatar_url: string | null;
      encrypted_token: string;
      timezone: string;
      digest_hour: number;
      now: string;
    }): Promise<UserRow> {
      await db
        .prepare(
          `INSERT INTO users (id, github_id, login, avatar_url, encrypted_token, timezone, digest_hour, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
           ON CONFLICT(github_id) DO UPDATE SET
             login = excluded.login, avatar_url = excluded.avatar_url,
             encrypted_token = excluded.encrypted_token, updated_at = excluded.updated_at`,
        )
        .bind(
          input.id,
          input.github_id,
          input.login,
          input.avatar_url,
          input.encrypted_token,
          input.timezone,
          input.digest_hour,
          input.now,
        )
        .run();
      const row = await this.findUserByGithubId(input.github_id);
      if (!row) throw new Error("upsert user failed");
      return row;
    },
    async updateUserSettings(
      userId: string,
      s: {
        repo_owner: string;
        repo_name: string;
        repo_branch: string;
        repo_path_prefix: string;
        timezone: string;
        digest_hour: number;
      },
      now: string,
    ) {
      await db
        .prepare(
          `UPDATE users SET repo_owner=?2, repo_name=?3, repo_branch=?4, repo_path_prefix=?5, timezone=?6, digest_hour=?7, updated_at=?8 WHERE id=?1`,
        )
        .bind(
          userId,
          s.repo_owner,
          s.repo_name,
          s.repo_branch,
          s.repo_path_prefix,
          s.timezone,
          s.digest_hour,
          now,
        )
        .run();
    },
    async listUsersWithRepo() {
      const r = await db
        .prepare("SELECT * FROM users WHERE repo_owner IS NOT NULL AND repo_name IS NOT NULL")
        .all<UserRow>();
      return r.results;
    },

    // ---- sessions
    async createSession(id: string, userId: string, expiresAt: string, now: string) {
      await db
        .prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
        .bind(id, userId, expiresAt, now)
        .run();
    },
    async findUserBySession(sessionId: string, now: string) {
      return db
        .prepare(
          `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > ?`,
        )
        .bind(sessionId, now)
        .first<UserRow>();
    },
    async deleteSession(sessionId: string) {
      await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
    },

    // ---- captures / turns
    async createCapture(c: {
      id: string;
      user_id: string;
      raw_text: string;
      local_date: string;
      now: string;
    }) {
      await db
        .prepare(
          `INSERT INTO captures (id, user_id, raw_text, status, round, local_date, created_at, updated_at) VALUES (?1, ?2, ?3, 'clarifying', 0, ?4, ?5, ?5)`,
        )
        .bind(c.id, c.user_id, c.raw_text, c.local_date, c.now)
        .run();
    },
    async getCapture(id: string, userId: string) {
      return db
        .prepare("SELECT * FROM captures WHERE id = ? AND user_id = ?")
        .bind(id, userId)
        .first<CaptureRow>();
    },
    async updateCapture(
      id: string,
      patch: { status: CaptureRow["status"]; round: number },
      now: string,
    ) {
      await db
        .prepare("UPDATE captures SET status = ?, round = ?, updated_at = ? WHERE id = ?")
        .bind(patch.status, patch.round, now, id)
        .run();
    },
    async addTurn(t: {
      id: string;
      capture_id: string;
      role: TurnRow["role"];
      content: string;
      now: string;
    }) {
      await db
        .prepare(
          "INSERT INTO conversation_turns (id, capture_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(t.id, t.capture_id, t.role, t.content, t.now)
        .run();
    },
    async listTurns(captureId: string) {
      const r = await db
        .prepare("SELECT * FROM conversation_turns WHERE capture_id = ? ORDER BY created_at, rowid")
        .bind(captureId)
        .all<TurnRow>();
      return r.results;
    },

    // ---- memos
    async createMemo(m: {
      id: string;
      user_id: string;
      capture_id: string | null;
      local_date: string;
      memo: Memo;
      now: string;
    }) {
      await db
        .prepare(
          `INSERT INTO memos (id, user_id, capture_id, local_date, title, memo_json, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)`,
        )
        .bind(
          m.id,
          m.user_id,
          m.capture_id,
          m.local_date,
          m.memo.title,
          JSON.stringify(m.memo),
          m.now,
        )
        .run();
    },
    async getMemo(id: string, userId: string) {
      return db
        .prepare("SELECT * FROM memos WHERE id = ? AND user_id = ?")
        .bind(id, userId)
        .first<MemoRow>();
    },
    async listMemosByDate(userId: string, localDate: string) {
      const r = await db
        .prepare("SELECT * FROM memos WHERE user_id = ? AND local_date = ? ORDER BY created_at")
        .bind(userId, localDate)
        .all<MemoRow>();
      return r.results;
    },
    async listRecentDates(userId: string, limit = 30) {
      const r = await db
        .prepare(
          "SELECT local_date, COUNT(*) AS n FROM memos WHERE user_id = ? GROUP BY local_date ORDER BY local_date DESC LIMIT ?",
        )
        .bind(userId, limit)
        .all<{ local_date: string; n: number }>();
      return r.results;
    },
    async updateMemo(id: string, userId: string, memo: Memo, now: string) {
      const r = await db
        .prepare(
          "UPDATE memos SET title = ?, memo_json = ?, updated_at = ? WHERE id = ? AND user_id = ?",
        )
        .bind(memo.title, JSON.stringify(memo), now, id, userId)
        .run();
      return (r.meta.changes ?? 0) > 0;
    },
    async deleteMemo(id: string, userId: string) {
      const r = await db
        .prepare("DELETE FROM memos WHERE id = ? AND user_id = ?")
        .bind(id, userId)
        .run();
      return (r.meta.changes ?? 0) > 0;
    },

    // ---- digests
    async getDigest(userId: string, localDate: string) {
      return db
        .prepare("SELECT * FROM daily_digests WHERE user_id = ? AND local_date = ?")
        .bind(userId, localDate)
        .first<DigestRow>();
    },
    async upsertDigest(d: {
      id: string;
      user_id: string;
      local_date: string;
      insight: Insight | null;
      content_hash: string | null;
      commit_sha: string | null;
      repo_path: string | null;
      status: DigestRow["status"];
      last_error: string | null;
      committed_at: string | null;
      now: string;
    }) {
      await db
        .prepare(
          `INSERT INTO daily_digests (id, user_id, local_date, insight_json, content_hash, commit_sha, repo_path, status, last_error, committed_at, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11)
           ON CONFLICT(user_id, local_date) DO UPDATE SET
             insight_json = COALESCE(excluded.insight_json, daily_digests.insight_json),
             content_hash = COALESCE(excluded.content_hash, daily_digests.content_hash),
             commit_sha = COALESCE(excluded.commit_sha, daily_digests.commit_sha),
             repo_path = COALESCE(excluded.repo_path, daily_digests.repo_path),
             status = excluded.status, last_error = excluded.last_error,
             committed_at = COALESCE(excluded.committed_at, daily_digests.committed_at),
             updated_at = excluded.updated_at`,
        )
        .bind(
          d.id,
          d.user_id,
          d.local_date,
          d.insight ? JSON.stringify(d.insight) : null,
          d.content_hash,
          d.commit_sha,
          d.repo_path,
          d.status,
          d.last_error,
          d.committed_at,
          d.now,
        )
        .run();
    },
    async listFailedDigests(userId: string, limit = 3) {
      const r = await db
        .prepare(
          "SELECT * FROM daily_digests WHERE user_id = ? AND status = 'failed' ORDER BY local_date DESC LIMIT ?",
        )
        .bind(userId, limit)
        .all<DigestRow>();
      return r.results;
    },
  };
}

export type Repo = ReturnType<typeof createRepo>;
