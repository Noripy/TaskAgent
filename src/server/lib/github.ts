import { utf8ToBase64 } from "./crypto.js";

/**
 * GitHub OAuth + Contents API の薄いクライアント。
 * OAuth のトークンでログインとリポジトリ書き込みを兼ねる（外部 IdP 不要）。
 */
const UA = "TaskAgent (+https://github.com/Noripy/TaskAgent)";

export class GitHubError extends Error {
  override readonly name = "GitHubError";
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export function oauthAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  scope: string;
}): string {
  const u = new URL("https://github.com/login/oauth/authorize");
  u.searchParams.set("client_id", input.clientId);
  u.searchParams.set("redirect_uri", input.redirectUri);
  u.searchParams.set("state", input.state);
  u.searchParams.set("scope", input.scope);
  return u.toString();
}

export async function exchangeCodeForToken(input: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  fetchImpl: typeof fetch;
}): Promise<string> {
  const res = await input.fetchImpl("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", "user-agent": UA },
    body: JSON.stringify({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      code: input.code,
      redirect_uri: input.redirectUri,
    }),
  });
  if (!res.ok) throw new GitHubError(`token exchange failed: ${res.status}`, res.status);
  const json = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!json.access_token)
    throw new GitHubError(
      `token exchange error: ${json.error_description ?? json.error ?? "unknown"}`,
    );
  return json.access_token;
}

export interface GitHubViewer {
  id: number;
  login: string;
  avatar_url: string | null;
}

async function api<T>(
  fetchImpl: typeof fetch,
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: T }> {
  const res = await fetchImpl(`https://api.github.com${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "user-agent": UA,
      "x-github-api-version": "2022-11-28",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body: body as T };
}

export async function fetchViewer(fetchImpl: typeof fetch, token: string): Promise<GitHubViewer> {
  const { status, body } = await api<GitHubViewer & { message?: string }>(
    fetchImpl,
    token,
    "/user",
  );
  if (status !== 200)
    throw new GitHubError(`GET /user failed: ${status} ${body?.message ?? ""}`, status);
  return { id: body.id, login: body.login, avatar_url: body.avatar_url ?? null };
}

export async function checkRepoWritable(
  fetchImpl: typeof fetch,
  token: string,
  owner: string,
  repo: string,
): Promise<{ ok: true; defaultBranch: string } | { ok: false; reason: string }> {
  const { status, body } = await api<{
    default_branch?: string;
    permissions?: { push?: boolean };
    message?: string;
  }>(fetchImpl, token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  if (status === 404)
    return {
      ok: false,
      reason: "リポジトリが見つかりません（private の場合は repo スコープが必要）",
    };
  if (status !== 200) return { ok: false, reason: `GitHub API ${status}: ${body?.message ?? ""}` };
  if (!body.permissions?.push)
    return { ok: false, reason: "このリポジトリへの push 権限がありません" };
  return { ok: true, defaultBranch: body.default_branch ?? "main" };
}

export interface CommitFileInput {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  path: string;
  content: string;
  message: string;
  fetchImpl: typeof fetch;
}

/**
 * Contents API で 1 ファイルを作成/更新する（1 コミット）。
 * 既存ファイルがあれば sha を取得して更新。無ければ新規作成。
 */
export async function commitFile(
  input: CommitFileInput,
): Promise<{ commitSha: string; contentSha: string }> {
  const encPath = input.path.split("/").map(encodeURIComponent).join("/");
  const base = `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/contents/${encPath}`;

  const existing = await api<{ sha?: string; message?: string }>(
    input.fetchImpl,
    input.token,
    `${base}?ref=${encodeURIComponent(input.branch)}`,
  );
  let sha: string | undefined;
  if (existing.status === 200 && existing.body?.sha) sha = existing.body.sha;
  else if (existing.status !== 404) {
    throw new GitHubError(
      `GET contents failed: ${existing.status} ${existing.body?.message ?? ""}`,
      existing.status,
    );
  }

  const put = await api<{
    commit?: { sha?: string };
    content?: { sha?: string };
    message?: string;
  }>(input.fetchImpl, input.token, base, {
    method: "PUT",
    body: JSON.stringify({
      message: input.message,
      content: utf8ToBase64(input.content),
      branch: input.branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (put.status !== 200 && put.status !== 201) {
    throw new GitHubError(
      `PUT contents failed: ${put.status} ${put.body?.message ?? ""}`,
      put.status,
    );
  }
  return { commitSha: put.body.commit?.sha ?? "", contentSha: put.body.content?.sha ?? "" };
}
