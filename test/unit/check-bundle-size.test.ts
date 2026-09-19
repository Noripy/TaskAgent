import { describe, expect, it } from "vitest";
import { evaluateSize, WORKER_GZIP_LIMIT } from "../../scripts/check-bundle-size.mjs";

describe("evaluateSize", () => {
  it("accepts a bundle under the Workers free-tier limit", () => {
    const r = evaluateSize(300_000);
    expect(r.ok).toBe(true);
    expect(r.message).toContain("293.0 KiB");
  });
  it("rejects a bundle over the limit", () => {
    expect(evaluateSize(WORKER_GZIP_LIMIT + 1).ok).toBe(false);
  });
  it("reports the used percentage", () => {
    expect(evaluateSize(WORKER_GZIP_LIMIT / 2).message).toContain("50%");
  });
});
