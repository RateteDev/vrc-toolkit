import { describe, expect, test } from "bun:test";
import { MAX_BIO_LENGTH, MAX_BIO_LINKS, validateBio, validateBioLinks } from "./profile";

describe("validateBio", () => {
  test("passes through a bio within the length limit", () => {
    expect(validateBio("hello\nworld")).toBe("hello\nworld");
  });

  test("rejects a bio over MAX_BIO_LENGTH", () => {
    const tooLong = "a".repeat(MAX_BIO_LENGTH + 1);
    expect(() => validateBio(tooLong)).toThrow();
  });

  test("accepts a bio exactly at MAX_BIO_LENGTH", () => {
    const atLimit = "a".repeat(MAX_BIO_LENGTH);
    expect(validateBio(atLimit)).toBe(atLimit);
  });
});

describe("validateBioLinks", () => {
  test("drops empty/whitespace-only slots", () => {
    expect(validateBioLinks(["https://example.com", "", "  "])).toEqual(["https://example.com"]);
  });

  test(`rejects more than ${MAX_BIO_LINKS} non-empty entries`, () => {
    expect(() =>
      validateBioLinks(["https://a.com", "https://b.com", "https://c.com", "https://d.com"]),
    ).toThrow();
  });

  test("rejects a non-http(s) URL", () => {
    expect(() => validateBioLinks(["javascript:alert(1)"])).toThrow();
    expect(() => validateBioLinks(["not a url"])).toThrow();
  });

  test("accepts up to 3 valid http(s) URLs", () => {
    expect(validateBioLinks(["https://a.com", "http://b.com"])).toEqual([
      "https://a.com",
      "http://b.com",
    ]);
  });
});
