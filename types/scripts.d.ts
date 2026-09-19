// scripts/*.mjs（JS）をテストから import するための最小の型宣言。
declare module "*/check-claude-md.mjs" {
  export function findPathTokens(markdown: string, modules?: Set<string>): string[];
  export function findPnpmScripts(markdown: string): string[];
  export function rulePathRoots(markdown: string): string[];
  export function resolveExists(
    token: string,
    ruleRoots: string[],
    exists?: (p: string) => boolean,
  ): boolean;
}
declare module "*/check-bundle-size.mjs" {
  export const WORKER_GZIP_LIMIT: number;
  export function evaluateSize(bytes: number, limit?: number): { ok: boolean; message: string };
}
declare module "*/sync-wrangler-from-terraform.mjs" {
  export function replaceDatabaseId(jsonc: string, id: string): string;
}
