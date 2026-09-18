import { describe, expect, it } from "vitest";
import {
  decryptString,
  encryptString,
  sha256Hex,
  utf8ToBase64,
} from "../../src/server/lib/crypto.js";

const KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="; // 32 zero bytes (test only)

describe("crypto", () => {
  it("round-trips a token", async () => {
    const ct = await encryptString("gho_secret", KEY);
    expect(ct).not.toContain("gho_secret");
    expect(await decryptString(ct, KEY)).toBe("gho_secret");
  });
  it("produces different ciphertexts for same input (random iv)", async () => {
    expect(await encryptString("x", KEY)).not.toBe(await encryptString("x", KEY));
  });
  it("rejects wrong key length", async () => {
    await expect(encryptString("x", "c2hvcnQ=")).rejects.toThrow(/32 bytes/);
  });
  it("sha256 and base64 handle utf-8", async () => {
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(utf8ToBase64("日本語")).toBe("5pel5pys6Kqe");
  });
});
