import { describe, expect, test } from "bun:test";
import { buildProfilePatch } from "./myCardPatch";

describe("buildProfilePatch", () => {
  test("builds a users.update patch from the 3-slot form", () => {
    expect(
      buildProfilePatch({
        bio: "hello\nworld",
        bioLinks: ["https://example.com", "", "  "],
        pronouns: "they/them",
      }),
    ).toEqual({
      bio: "hello\nworld",
      bioLinks: ["https://example.com"],
      pronouns: "they/them",
    });
  });

  test("trims pronouns", () => {
    expect(
      buildProfilePatch({ bio: "", bioLinks: ["", "", ""], pronouns: "  they/them  " }),
    ).toEqual({ bio: "", bioLinks: [], pronouns: "they/them" });
  });

  test("throws with a Japanese message when a link is not http(s)", () => {
    expect(() =>
      buildProfilePatch({ bio: "", bioLinks: ["ftp://x.com", "", ""], pronouns: "" }),
    ).toThrow(/http\(s\)/);
  });

  test("throws when bio exceeds the length limit", () => {
    expect(() =>
      buildProfilePatch({ bio: "a".repeat(513), bioLinks: ["", "", ""], pronouns: "" }),
    ).toThrow();
  });
});
