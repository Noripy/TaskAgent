import { describe, expect, it } from "vitest";
import {
  findPathTokens,
  findPnpmScripts,
  resolveExists,
  rulePathRoots,
} from "../../scripts/check-claude-md.mjs";

describe("check-claude-md", () => {
  it("extracts path-like tokens only", () => {
    const md =
      "`src/core/` と `docs/x.md` を見る。`pnpm verify` は `Deps` 経由。`@hono/zod-validator` `hono/client` `/learn` `**/*.ts` `.claude/settings.local.json` は除外。";
    expect(findPathTokens(md, new Set(["hono"])).sort()).toEqual(["docs/x.md", "src/core"]);
  });
  it("resolves relative tokens against rule roots and .claude", () => {
    const fs = new Set([
      "src/server/db/repo.ts",
      ".claude/settings.json",
      "migrations/0001_init.sql",
    ]);
    const exists = (p: string) => fs.has(p);
    expect(resolveExists("db/repo.ts", ["src/server", "migrations"], exists)).toBe(true);
    expect(resolveExists("0001_init.sql", ["src/server", "migrations"], exists)).toBe(true);
    expect(resolveExists("settings.json", [], exists)).toBe(true);
    expect(resolveExists("nope.ts", ["src/server"], exists)).toBe(false);
  });
  it("extracts pnpm script names", () => {
    expect(findPnpmScripts("`pnpm verify` / pnpm test:unit / pnpm install").sort()).toEqual([
      "install",
      "test:unit",
      "verify",
    ]);
  });
  it("reads rule path roots from frontmatter", () => {
    const md = '---\npaths:\n  - "src/core/**"\n  - "test/core/**"\n---\n# x';
    expect(rulePathRoots(md)).toEqual(["src/core", "test/core"]);
  });
});
