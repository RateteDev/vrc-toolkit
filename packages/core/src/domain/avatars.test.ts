// Unit tests for the avatars pure helper fmtAvatar (spec No.22). Pagination
// itself lives in namespaces/_shared.ts, outside the domain layer.

import { describe, expect, it } from "bun:test";
import { fmtAvatar, type RawAvatar } from "./avatars";

describe("fmtAvatar", () => {
  it("absorbs snake_case updated_at into camelCase updatedAt", () => {
    const raw: RawAvatar = {
      id: "avtr_1",
      name: "My Avatar",
      releaseStatus: "private",
      thumbnailImageUrl: "https://i/thumb.png",
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-06-01T12:00:00.000Z",
    };
    expect(fmtAvatar(raw)).toEqual({
      id: "avtr_1",
      name: "My Avatar",
      releaseStatus: "private",
      thumbnailImageUrl: "https://i/thumb.png",
      updatedAt: "2024-06-01T12:00:00.000Z",
    });
  });

  it("defaults missing fields to safe empties (no crash on sparse input)", () => {
    expect(fmtAvatar({})).toEqual({
      id: "",
      name: "",
      releaseStatus: "",
      thumbnailImageUrl: null,
      updatedAt: "",
    });
  });

  it("keeps the public releaseStatus value as-is", () => {
    const s = fmtAvatar({
      id: "avtr_2",
      name: "Pub",
      releaseStatus: "public",
      updated_at: "2025-02-02T00:00:00.000Z",
    });
    expect(s.releaseStatus).toBe("public");
    expect(s.updatedAt).toBe("2025-02-02T00:00:00.000Z");
    expect(s.thumbnailImageUrl).toBeNull();
  });
});
