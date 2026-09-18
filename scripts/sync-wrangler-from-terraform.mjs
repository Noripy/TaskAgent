#!/usr/bin/env node
/**
 * `terraform output -json` の d1_database_id を wrangler.jsonc の database_id に反映する。
 * コメント付き JSONC を壊さないよう、JSON.parse せず正規表現で該当行だけ置き換える。
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function replaceDatabaseId(jsonc, id) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error(`database_id の形式が不正です: ${id}`);
  const re = /("database_id"\s*:\s*")[^"]*(")/;
  if (!re.test(jsonc)) throw new Error("wrangler.jsonc に database_id がありません");
  return jsonc.replace(re, `$1${id}$2`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const out = JSON.parse(
    execFileSync("terraform", ["-chdir=infra/terraform", "output", "-json"], {
      cwd: root,
      encoding: "utf8",
    }),
  );
  const id = out.d1_database_id?.value;
  if (!id) throw new Error("terraform output に d1_database_id がありません（apply 済みですか？）");
  const p = join(root, "wrangler.jsonc");
  const before = readFileSync(p, "utf8");
  const after = replaceDatabaseId(before, id);
  if (before === after) console.log("wrangler.jsonc: 変更なし");
  else {
    writeFileSync(p, after);
    console.log(`wrangler.jsonc: database_id を ${id} に更新しました`);
  }
  const gw = out.ai_gateway_base_url?.value;
  if (gw) console.log(`GEMINI_BASE_URL に設定する値: ${gw}`);
}
