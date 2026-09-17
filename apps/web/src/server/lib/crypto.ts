/**
 * GitHub トークンの保存用暗号化（AES-256-GCM, Web Crypto）。
 * 形式: base64(iv) + "." + base64(ciphertext)
 */
const enc = new TextEncoder();
const dec = new TextDecoder();

function b64encode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function b64decode(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importKey(keyB64: string): Promise<CryptoKey> {
  const raw = b64decode(keyB64);
  if (raw.byteLength !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes (base64)");
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptString(plain: string, keyB64: string): Promise<string> {
  const key = await importKey(keyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plain));
  return `${b64encode(iv)}.${b64encode(new Uint8Array(ct))}`;
}

export async function decryptString(payload: string, keyB64: string): Promise<string> {
  const [ivB64, ctB64] = payload.split(".");
  if (!ivB64 || !ctB64) throw new Error("invalid ciphertext format");
  const key = await importKey(keyB64);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64decode(ivB64) },
    key,
    b64decode(ctB64),
  );
  return dec.decode(pt);
}

export async function sha256Hex(s: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** UTF-8 文字列を base64 に（GitHub Contents API 用）。 */
export function utf8ToBase64(s: string): string {
  return b64encode(enc.encode(s));
}
