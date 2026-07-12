// Unit tests for the worlds pure helpers: fmtWorld (raw->summary narrowing
// for the favorites/recent list views) and worldFavoriteGroups (favorite
// group filter/sort for the grouped favorites UI).

import { describe, expect, it } from "bun:test";
import type { VRChatFavoriteGroup, VRChatWorld } from "../types";
import { fmtWorld, worldFavoriteGroups } from "./worlds";

describe("fmtWorld", () => {
  it("narrows a raw world into the display summary", () => {
    const raw: VRChatWorld = {
      id: "wrld_1",
      name: "月の海",
      thumbnailImageUrl: "https://i/thumb.png",
      authorName: "author-a",
      capacity: 16,
      occupants: 3,
      favorites: 42,
    };
    expect(fmtWorld(raw)).toEqual({
      id: "wrld_1",
      name: "月の海",
      thumbnailImageUrl: "https://i/thumb.png",
      authorName: "author-a",
      capacity: 16,
      occupants: 3,
      favoriteCount: 42,
    });
  });

  it("defaults missing fields to safe empties (no crash on sparse input)", () => {
    expect(fmtWorld({})).toEqual({
      id: "",
      name: "",
      thumbnailImageUrl: null,
      authorName: "",
      capacity: null,
      occupants: null,
      favoriteCount: null,
    });
  });
});

describe("worldFavoriteGroups", () => {
  it("keeps only type=world groups, sorted by name (worlds1..worlds4)", () => {
    const raw: VRChatFavoriteGroup[] = [
      { name: "worlds3", displayName: "worlds3", type: "world", visibility: "private" },
      { name: "avatars1", displayName: "avatars1", type: "avatar", visibility: "private" },
      { name: "worlds1", displayName: "お出かけ用", type: "world", visibility: "friends" },
      { name: "friends1", displayName: "friends1", type: "friend", visibility: "private" },
    ];
    expect(worldFavoriteGroups(raw)).toEqual([
      { name: "worlds1", displayName: "お出かけ用", visibility: "friends" },
      { name: "worlds3", displayName: "worlds3", visibility: "private" },
    ]);
  });

  it("falls back displayName to name when displayName is empty", () => {
    expect(worldFavoriteGroups([{ name: "worlds2", displayName: "", type: "world" }])).toEqual([
      { name: "worlds2", displayName: "worlds2", visibility: "" },
    ]);
  });

  it("returns [] for an empty input", () => {
    expect(worldFavoriteGroups([])).toEqual([]);
  });
});
