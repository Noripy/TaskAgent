import { describe, expect, it, vi } from "vitest";
import {
  checkRepoWritable,
  commitFile,
  exchangeCodeForToken,
  GitHubError,
  oauthAuthorizeUrl,
} from "../../src/server/lib/github.js";

type Call = { url: string; method: string; body: unknown; headers: Record<string, string> };

function router(routes: Array<{ match: (c: Call) => boolean; respond: (c: Call) => Response }>) {
  const calls: Call[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const c: Call = {
      url: String(input),
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : null,
      headers: (init?.headers as Record<string, string>) ?? {},
    };
    calls.push(c);
    const r = routes.find((x) => x.match(c));
    return r ? r.respond(c) : new Response("no route", { status: 599 });
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

describe("github", () => {
  it("builds authorize url", () => {
    const u = new URL(
      oauthAuthorizeUrl({ clientId: "id", redirectUri: "https://x/cb", state: "s", scope: "repo" }),
    );
    expect(u.searchParams.get("client_id")).toBe("id");
    expect(u.searchParams.get("scope")).toBe("repo");
  });

  it("exchanges code", async () => {
    const { fetchImpl } = router([
      {
        match: (c) => c.url.includes("access_token"),
        respond: () => Response.json({ access_token: "gho_x" }),
      },
    ]);
    expect(
      await exchangeCodeForToken({
        clientId: "a",
        clientSecret: "b",
        code: "c",
        redirectUri: "r",
        fetchImpl,
      }),
    ).toBe("gho_x");
  });

  it("commitFile creates new file when 404", async () => {
    const { fetchImpl, calls } = router([
      {
        match: (c) => c.method === "GET",
        respond: () => new Response('{"message":"Not Found"}', { status: 404 }),
      },
      {
        match: (c) => c.method === "PUT",
        respond: () =>
          Response.json({ commit: { sha: "abc" }, content: { sha: "def" } }, { status: 201 }),
      },
    ]);
    const r = await commitFile({
      token: "t",
      owner: "o",
      repo: "r",
      branch: "main",
      path: "notes/2026/09/2026-09-17.md",
      content: "# hi 日本語",
      message: "m",
      fetchImpl,
    });
    expect(r.commitSha).toBe("abc");
    const put = calls.find((c) => c.method === "PUT") as Call;
    expect(put.url).toBe("https://api.github.com/repos/o/r/contents/notes/2026/09/2026-09-17.md");
    expect((put.body as { sha?: string }).sha).toBeUndefined();
    expect((put.body as { content: string }).content).toBe("IyBoaSDml6XmnKzoqp4=");
    expect(put.headers.authorization).toBe("Bearer t");
  });

  it("commitFile updates with sha when file exists", async () => {
    const { fetchImpl, calls } = router([
      { match: (c) => c.method === "GET", respond: () => Response.json({ sha: "old" }) },
      {
        match: (c) => c.method === "PUT",
        respond: () => Response.json({ commit: { sha: "new" } }),
      },
    ]);
    await commitFile({
      token: "t",
      owner: "o",
      repo: "r",
      branch: "main",
      path: "a.md",
      content: "x",
      message: "m",
      fetchImpl,
    });
    expect(((calls.find((c) => c.method === "PUT") as Call).body as { sha: string }).sha).toBe(
      "old",
    );
  });

  it("commitFile throws on PUT failure", async () => {
    const { fetchImpl } = router([
      { match: (c) => c.method === "GET", respond: () => new Response("", { status: 404 }) },
      {
        match: (c) => c.method === "PUT",
        respond: () => Response.json({ message: "bad" }, { status: 422 }),
      },
    ]);
    await expect(
      commitFile({
        token: "t",
        owner: "o",
        repo: "r",
        branch: "b",
        path: "p",
        content: "c",
        message: "m",
        fetchImpl,
      }),
    ).rejects.toThrow(GitHubError);
  });

  it("checkRepoWritable reports push permission", async () => {
    const { fetchImpl } = router([
      {
        match: () => true,
        respond: () => Response.json({ default_branch: "main", permissions: { push: false } }),
      },
    ]);
    const r = await checkRepoWritable(fetchImpl, "t", "o", "r");
    expect(r.ok).toBe(false);
  });
});
