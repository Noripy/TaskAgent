import { describe, expect, it } from "vitest";
import { replaceDatabaseId } from "../../scripts/sync-wrangler-from-terraform.mjs";

const jsonc = `{
  // comment
  "d1_databases": [{ "binding": "DB", "database_id": "00000000-0000-0000-0000-000000000000" }]
}`;

describe("replaceDatabaseId", () => {
  it("replaces only the id and keeps comments", () => {
    const out = replaceDatabaseId(jsonc, "12345678-1234-1234-1234-123456789abc");
    expect(out).toContain("// comment");
    expect(out).toContain('"database_id": "12345678-1234-1234-1234-123456789abc"');
  });
  it("rejects malformed ids", () => {
    expect(() => replaceDatabaseId(jsonc, "not-a-uuid")).toThrow(/形式/);
  });
  it("fails when key is missing", () => {
    expect(() => replaceDatabaseId("{}", "12345678-1234-1234-1234-123456789abc")).toThrow(
      /database_id/,
    );
  });
});
