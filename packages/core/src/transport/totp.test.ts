// Validates the HOTP/Base32 port against the RFC 4226 reference vectors.
// Secret = ASCII "12345678901234567890".

import { describe, expect, test } from "bun:test";
import { base32ToBytes, generateTotp, hotp } from "./totp";

const ASCII_SECRET = "12345678901234567890";
// Base32 of ASCII_SECRET (RFC 4648).
const BASE32_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

// RFC 4226 Appendix D, truncated 6-digit HOTP values.
const RFC4226_VECTORS = [
  "755224",
  "287082",
  "359152",
  "969429",
  "338314",
  "254676",
  "287922",
  "162583",
  "399871",
  "520489",
];

describe("base32ToBytes", () => {
  test("decodes RFC 4226 secret to its ASCII bytes", () => {
    const bytes = base32ToBytes(BASE32_SECRET);
    expect(new TextDecoder().decode(bytes)).toBe(ASCII_SECRET);
  });

  test("ignores padding and lowercase", () => {
    const bytes = base32ToBytes("gezdgnbvgy3tqojqgezdgnbvgy3tqojq====");
    expect(new TextDecoder().decode(bytes)).toBe(ASCII_SECRET);
  });

  test("throws on an empty secret", () => {
    expect(() => base32ToBytes("")).toThrow();
  });

  test("throws on characters outside the Base32 alphabet", () => {
    // "0", "1", "8", "9" are not part of the RFC 4648 Base32 alphabet.
    expect(() => base32ToBytes("GEZDGNBV1Y3TQOJQ")).toThrow();
    expect(() => base32ToBytes("not-base32!")).toThrow();
  });

  test("throws when only padding remains after stripping", () => {
    expect(() => base32ToBytes("========")).toThrow();
  });
});

describe("hotp", () => {
  const key = new TextEncoder().encode(ASCII_SECRET);
  RFC4226_VECTORS.forEach((expected, counter) => {
    test(`counter ${counter} -> ${expected}`, async () => {
      expect(await hotp(key, counter)).toBe(expected);
    });
  });
});

describe("generateTotp", () => {
  test("derives the counter from the 30s window and matches hotp", async () => {
    // A fixed instant lands in a specific 30s window; generateTotp must equal
    // hotp for that window's counter.
    const nowMs = 59_000;
    const counter = Math.floor(nowMs / 1000 / 30);
    const key = base32ToBytes(BASE32_SECRET);
    expect(await generateTotp(BASE32_SECRET, nowMs)).toBe(await hotp(key, counter));
  });

  test("returns a 6-digit code", async () => {
    const code = await generateTotp(BASE32_SECRET, 0);
    expect(code).toMatch(/^\d{6}$/);
  });
});
