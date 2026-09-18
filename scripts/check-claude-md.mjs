#!/usr/bin/env node
/**
 * CLAUDE.md と .claude/rules/*.md が実体とズレていないかを機械検査する。
 * - バッククォートで書かれたパスが存在するか
 * - `pnpm <script>` が package.json の scripts にあるか
 * - rules の frontmatter `paths:` の先頭ディレクトリが存在するか
 * ズレがあれば 1 行ずつ出力して exit 1。`pnpm check:docs` / CI / Stop フックから呼ばれる。
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const scripts = Object.keys(pkg.scripts ?? {});
const PNPM_BUILTIN = new Set([
  "install",
  "add",
  "remove",
  "exec",
  "dlx",
  "run",
  "why",
  "update",
  "outdated",
]);
const MODULES = new Set(
  Object.keys({ ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }),
);

/** バッククォート内からパスらしい文字列だけを抜く。 */
export function findPathTokens(markdown, modules = MODULES) {
  const out = new Set();
  for (const m of markdown.matchAll(/`([^`\n]+)`/g)) {
    const t = m[1].trim().replace(/\/$/, "");
    if (!/^[\w.@/-]+$/.test(t)) continue; // 空白や記号を含むものはパスではない
    if (!t.includes("/") && !/\.(md|json|jsonc|ts|tsx|mjs|sh|sql|yml|yaml|toml|tf)$/.test(t))
      continue;
    if (t.startsWith("@") || t.startsWith("/") || t.startsWith("http") || t.includes("*")) continue; // scoped pkg・スラッシュコマンド・URL・glob
    if (modules.has(t.split("/")[0])) continue; // npm モジュール（hono/client など）
    if (/\.local\./.test(t)) continue; // git 管理外の個人ファイル
    out.add(t);
  }
  return [...out];
}

/** ルートに無ければ、ルールの paths ルートや .claude 配下に相対解決して存在を判定する。 */
export function resolveExists(token, ruleRoots, exists = (p) => existsSync(join(root, p))) {
  const candidates = [token, ...ruleRoots.map((r) => `${r}/${token}`), `.claude/${token}`];
  return candidates.some(exists);
}

export function findPnpmScripts(markdown) {
  const out = new Set();
  for (const m of markdown.matchAll(/pnpm\s+([a-z][\w:-]*)/g)) out.add(m[1]);
  return [...out];
}

export function rulePathRoots(markdown) {
  const fm = /^---\n([\s\S]*?)\n---/.exec(markdown);
  if (!fm) return [];
  return [...fm[1].matchAll(/-\s*"?([^"\n]+?)"?\s*$/gm)]
    .map((m) => m[1].split("*")[0].replace(/\/$/, ""))
    .filter(Boolean);
}

function check(file, markdown) {
  const roots = rulePathRoots(markdown);
  for (const p of findPathTokens(markdown)) {
    if (!resolveExists(p, roots)) problems.push(`${file}: パス \`${p}\` が存在しません`);
  }
  for (const s of findPnpmScripts(markdown)) {
    if (PNPM_BUILTIN.has(s)) continue;
    if (!scripts.includes(s))
      problems.push(`${file}: \`pnpm ${s}\` は package.json の scripts にありません`);
  }
  for (const r of roots) {
    if (!existsSync(join(root, r)))
      problems.push(`${file}: rules の paths \`${r}\` が存在しません`);
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  check("CLAUDE.md", readFileSync(join(root, "CLAUDE.md"), "utf8"));
  const rulesDir = join(root, ".claude/rules");
  if (existsSync(rulesDir)) {
    for (const f of readdirSync(rulesDir).filter((f) => f.endsWith(".md"))) {
      check(`.claude/rules/${f}`, readFileSync(join(rulesDir, f), "utf8"));
    }
  }
  if (problems.length) {
    for (const p of problems) console.error(p);
    process.exit(1);
  }
  console.log("check-claude-md: OK");
}
