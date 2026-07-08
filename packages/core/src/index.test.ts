import { describe, expect, test } from "bun:test";
import { buildApiUrl, VRCHAT_API_BASE } from "./index";

describe("buildApiUrl", () => {
  test("prefixes the VRChat API base URL", () => {
    expect(buildApiUrl("/auth/user")).toBe(`${VRCHAT_API_BASE}/auth/user`);
  });

  test("tolerates a path without a leading slash", () => {
    expect(buildApiUrl("auth/user")).toBe(`${VRCHAT_API_BASE}/auth/user`);
  });
});
