import { describe, expect, test } from "bun:test";
import type { VRChatAvatar } from "@vrc-toolkit/core";
import type { AvatarFavoriteGroup } from "@vrc-toolkit/core/domain";
import { groupAvatarFavorites } from "./groupAvatarFavorites";

function avatar(over: Partial<VRChatAvatar>): VRChatAvatar {
  return { id: "avtr_x", name: "X", favoriteGroup: "avatars1", ...over };
}

describe("groupAvatarFavorites", () => {
  const groups: AvatarFavoriteGroup[] = [
    { name: "avatars1", displayName: "avatars1", visibility: "private" },
    { name: "avatars2", displayName: "お気に入り", visibility: "private" },
  ];

  test("buckets avatars into sections by favoriteGroup, ordered by the known group order", () => {
    const raw = [
      avatar({ id: "a", favoriteGroup: "avatars2" }),
      avatar({ id: "b", favoriteGroup: "avatars1" }),
      avatar({ id: "c", favoriteGroup: "avatars1" }),
    ];
    const sections = groupAvatarFavorites(raw, groups);
    expect(sections.map((s) => s.key)).toEqual(["avatars1", "avatars2"]);
    expect(sections[0]?.displayName).toBe("avatars1");
    expect(sections[0]?.avatars.map((a) => a.id)).toEqual(["b", "c"]);
    expect(sections[1]?.displayName).toBe("お気に入り");
    expect(sections[1]?.avatars.map((a) => a.id)).toEqual(["a"]);
  });

  test("a known group with no favorites still gets an (empty) section", () => {
    const sections = groupAvatarFavorites([avatar({ id: "a", favoriteGroup: "avatars1" })], groups);
    expect(sections[1]?.key).toBe("avatars2");
    expect(sections[1]?.avatars).toEqual([]);
  });

  test("a favoriteGroup with no matching known group falls back to its own section instead of being dropped", () => {
    const raw = [
      avatar({ id: "a", favoriteGroup: "avatars1" }),
      avatar({ id: "z", favoriteGroup: "avatars9" }),
    ];
    const sections = groupAvatarFavorites(raw, groups);
    expect(sections.map((s) => s.key)).toEqual(["avatars1", "avatars2", "avatars9"]);
    expect(sections[2]?.displayName).toBe("avatars9");
    expect(sections[2]?.avatars.map((a) => a.id)).toEqual(["z"]);
  });

  test("total avatars across sections matches the input count (nothing dropped)", () => {
    const raw = [
      avatar({ id: "a", favoriteGroup: "avatars1" }),
      avatar({ id: "b", favoriteGroup: "unknown-group" }),
      avatar({ id: "c", favoriteGroup: "" }),
    ];
    const sections = groupAvatarFavorites(raw, groups);
    const total = sections.reduce((n, s) => n + s.avatars.length, 0);
    expect(total).toBe(3);
  });
});
