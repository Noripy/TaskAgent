import { describe, expect, it } from "vitest";
import { digestPath, isValidYmd, localHour, toLocalDateString } from "../../src/core/dates.js";

describe("dates", () => {
  it("converts UTC instant to local date", () => {
    // 2026-09-17T15:30Z は東京では 9/18 00:30
    const d = new Date("2026-09-17T15:30:00Z");
    expect(toLocalDateString(d, "Asia/Tokyo")).toBe("2026-09-18");
    expect(toLocalDateString(d, "UTC")).toBe("2026-09-17");
  });
  it("gets local hour", () => {
    expect(localHour(new Date("2026-09-17T12:00:00Z"), "Asia/Tokyo")).toBe(21);
    expect(localHour(new Date("2026-09-17T15:00:00Z"), "Asia/Tokyo")).toBe(0);
  });
  it("validates ymd", () => {
    expect(isValidYmd("2026-02-29")).toBe(false);
    expect(isValidYmd("2024-02-29")).toBe(true);
    expect(isValidYmd("20260917")).toBe(false);
  });
  it("builds digest path", () => {
    expect(digestPath("notes", "2026-09-17")).toBe("notes/2026/09/2026-09-17.md");
    expect(digestPath("/notes/", "2026-09-17")).toBe("notes/2026/09/2026-09-17.md");
    expect(digestPath("", "2026-09-17")).toBe("2026/09/2026-09-17.md");
  });
});
