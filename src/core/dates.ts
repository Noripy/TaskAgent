/**
 * タイムゾーンを明示した日付処理。Workers は UTC で動くので、必ず tz を渡す。
 */
export function toLocalDateString(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function localHour(date: Date, timeZone: string): number {
  const h = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hour12: false,
  }).format(date);
  // 一部ランタイムは "24" を返すことがある
  return Number.parseInt(h, 10) % 24;
}

export function isValidYmd(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** リポジトリ内の日次ファイルパス。 例: notes/2026/09/2026-09-17.md */
export function digestPath(prefix: string, ymd: string): string {
  const [y, m] = ymd.split("-") as [string, string, string];
  const clean = prefix.replace(/^\/+|\/+$/g, "");
  return `${clean ? `${clean}/` : ""}${y}/${m}/${ymd}.md`;
}
