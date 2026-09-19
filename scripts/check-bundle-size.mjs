#!/usr/bin/env node
/**
 * Worker バンドルの gzip サイズが Cloudflare Workers 無料枠の上限に収まるか検査する。
 * `pnpm verify` の最後と CI（Docker イメージ内）で実行される。
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

/** Workers Free の圧縮後サイズ上限（3MB）。公式の料金ページで要再確認。 */
export const WORKER_GZIP_LIMIT = 3_000_000;

export function evaluateSize(bytes, limit = WORKER_GZIP_LIMIT) {
  const kib = (bytes / 1024).toFixed(1);
  const pct = Math.round((bytes / limit) * 100);
  return {
    ok: bytes <= limit,
    message: `worker bundle: ${kib} KiB gzip / 上限 ${(limit / 1024 / 1024).toFixed(0)} MB（${pct}%）`,
  };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const bundle = join(root, "dist/taskagent/index.js");
  if (!existsSync(bundle)) {
    console.error("dist/taskagent/index.js がありません。先に pnpm build を実行してください。");
    process.exit(1);
  }
  const { ok, message } = evaluateSize(gzipSync(readFileSync(bundle)).byteLength);
  console.log(message);
  if (!ok) {
    console.error("::error::Worker バンドルが無料枠の上限を超えています");
    process.exit(1);
  }
}
