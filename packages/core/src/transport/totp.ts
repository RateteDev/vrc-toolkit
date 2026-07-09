// TOTP / HOTP (RFC 6238 / RFC 4226), HMAC-SHA1, 6 digits, 30s step.
// Split so the HOTP core is testable against the RFC 4226 reference vectors
// without depending on wall-clock time. Uses Web Crypto only (Bun/browsers).

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// Strict RFC 4648 Base32 decode. Only the canonical alphabet plus trailing `=`
// padding is accepted; anything else (unsupported characters, an empty
// secret) fails loudly rather than silently dropping bytes from a malformed
// TOTP secret.
export function base32ToBytes(b32: string): Uint8Array {
  if (b32.length === 0) {
    throw new Error("base32ToBytes: secret must not be empty");
  }
  const withoutPadding = b32.toUpperCase().replace(/=+$/, "");
  if (withoutPadding.length === 0 || !/^[A-Z2-7]+$/.test(withoutPadding)) {
    throw new Error(`base32ToBytes: invalid Base32 secret: ${b32}`);
  }
  let bits = "";
  for (const ch of withoutPadding) {
    const val = BASE32_ALPHABET.indexOf(ch);
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

// HOTP for an explicit counter. Deterministic: the unit-testable core.
export async function hotp(key: Uint8Array, counter: number): Promise<string> {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  // high 32 bits stay zero; the counter fits in the low 32 bits for our lifetime
  view.setUint32(4, counter);
  // Copy into a fresh ArrayBuffer-backed view: importKey's BufferSource rejects
  // the SharedArrayBuffer-inclusive `Uint8Array<ArrayBufferLike>` default type.
  const keyBytes = new Uint8Array(key);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = new DataView(await crypto.subtle.sign("HMAC", cryptoKey, buf));
  // RFC 4226 dynamic truncation. DataView getters return plain numbers, so this
  // stays clean under noUncheckedIndexedAccess; getUint32 reads big-endian, and
  // masking the high bit matches the reference `(sig[offset] & 0x7f) << 24 | ...`.
  const offset = sig.getUint8(sig.byteLength - 1) & 0x0f;
  const code = (sig.getUint32(offset) & 0x7fffffff) % 1000000;
  return code.toString().padStart(6, "0");
}

// TOTP for the current 30s window from a Base32 secret.
export async function generateTotp(secretB32: string, nowMs: number = Date.now()): Promise<string> {
  const counter = Math.floor(nowMs / 1000 / 30);
  return hotp(base32ToBytes(secretB32), counter);
}
