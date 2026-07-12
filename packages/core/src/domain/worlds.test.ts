// Unit tests for the worlds pure helper fmtWorld: raw->summary narrowing for
// the favorites/recent list views.

import { describe, expect, it } from "bun:test";
import type { VRChatWorld } from "../types";
import { fmtWorld } from "./worlds";

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
