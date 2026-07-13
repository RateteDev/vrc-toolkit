// Unit tests for the avatars pure helper fmtAvatar (spec No.22). Pagination
// itself lives in namespaces/_shared.ts, outside the domain layer.

import { describe, expect, it } from "bun:test";
import type { VRChatFavoriteGroup } from "../types";
import { avatarFavoriteGroups, fmtAvatar, fmtFavoriteAvatar, type RawAvatar } from "./avatars";

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
      description: "",
      version: null,
      createdAt: "2024-01-01T00:00:00.000Z",
      platforms: [],
    });
  });

  it("defaults missing fields to safe empties (no crash on sparse input)", () => {
    expect(fmtAvatar({})).toEqual({
      id: "",
      name: "",
      releaseStatus: "",
      thumbnailImageUrl: null,
      updatedAt: "",
      description: "",
      version: null,
      createdAt: "",
      platforms: [],
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

  it("maps description and version when present", () => {
    const s = fmtAvatar({ description: "A cool avatar", version: 3 });
    expect(s.description).toBe("A cool avatar");
    expect(s.version).toBe(3);
  });

  it("defaults version to null when absent", () => {
    expect(fmtAvatar({}).version).toBeNull();
  });

  it("derives platforms from unityPackages, deduped by platform in first-appearance order", () => {
    const s = fmtAvatar({
      unityPackages: [
        { platform: "standalonewindows", performanceRating: "Excellent" },
        { platform: "android", performanceRating: "Medium" },
        { platform: "standalonewindows", performanceRating: "Poor" },
      ],
    });
    expect(s.platforms).toEqual([
      { platform: "standalonewindows", performanceRating: "Excellent" },
      { platform: "android", performanceRating: "Medium" },
    ]);
  });

  it("skips unityPackages entries without a platform string", () => {
    const s = fmtAvatar({
      unityPackages: [
        { performanceRating: "Excellent" },
        { platform: "android", performanceRating: "Medium" },
      ],
    });
    expect(s.platforms).toEqual([{ platform: "android", performanceRating: "Medium" }]);
  });

  it("sets performanceRating to null when absent on a unityPackages entry", () => {
    const s = fmtAvatar({ unityPackages: [{ platform: "ios" }] });
    expect(s.platforms).toEqual([{ platform: "ios", performanceRating: null }]);
  });

  it("returns an empty platforms array when unityPackages is absent", () => {
    expect(fmtAvatar({}).platforms).toEqual([]);
  });
});

describe("fmtFavoriteAvatar", () => {
  it("narrows a raw favorite avatar into AvatarSummary plus authorName/favoriteGroup/favoriteId", () => {
    const s = fmtFavoriteAvatar({
      id: "avtr_1",
      name: "My Avatar",
      releaseStatus: "public",
      authorName: "author-a",
      favoriteGroup: "avatars1",
      favoriteId: "fav_1",
      updated_at: "2025-02-02T00:00:00.000Z",
    });
    expect(s).toEqual({
      id: "avtr_1",
      name: "My Avatar",
      releaseStatus: "public",
      thumbnailImageUrl: null,
      updatedAt: "2025-02-02T00:00:00.000Z",
      description: "",
      version: null,
      createdAt: "",
      platforms: [],
      authorName: "author-a",
      favoriteGroup: "avatars1",
      favoriteId: "fav_1",
    });
  });

  it("defaults authorName/favoriteGroup/favoriteId to empty strings when absent", () => {
    const s = fmtFavoriteAvatar({});
    expect(s.authorName).toBe("");
    expect(s.favoriteGroup).toBe("");
    expect(s.favoriteId).toBe("");
  });
});

describe("avatarFavoriteGroups", () => {
  it("keeps only type=avatar groups, sorted by name", () => {
    const raw: VRChatFavoriteGroup[] = [
      { name: "avatars3", displayName: "avatars3", type: "avatar", visibility: "private" },
      { name: "worlds1", displayName: "worlds1", type: "world", visibility: "private" },
      { name: "avatars1", displayName: "お気に入り", type: "avatar", visibility: "friends" },
      { name: "friends1", displayName: "friends1", type: "friend", visibility: "private" },
    ];
    expect(avatarFavoriteGroups(raw)).toEqual([
      { name: "avatars1", displayName: "お気に入り", visibility: "friends" },
      { name: "avatars3", displayName: "avatars3", visibility: "private" },
    ]);
  });

  it("falls back displayName to name when displayName is empty", () => {
    expect(avatarFavoriteGroups([{ name: "avatars2", displayName: "", type: "avatar" }])).toEqual([
      { name: "avatars2", displayName: "avatars2", visibility: "" },
    ]);
  });

  it("returns [] for an empty input", () => {
    expect(avatarFavoriteGroups([])).toEqual([]);
  });
});
