import { describe, expect, test } from "bun:test";
import type { VRChatWorld } from "@vrc-toolkit/core";
import type { WorldFavoriteGroup } from "@vrc-toolkit/core/domain";
import { groupFavorites } from "./groupFavorites";

function world(over: Partial<VRChatWorld>): VRChatWorld {
  return { id: "wrld_x", name: "X", favoriteGroup: "worlds1", ...over };
}

describe("groupFavorites", () => {
  const groups: WorldFavoriteGroup[] = [
    { name: "worlds1", displayName: "worlds1", visibility: "private" },
    { name: "worlds2", displayName: "お出かけ用", visibility: "private" },
  ];

  test("buckets worlds into sections by favoriteGroup, ordered by the known group order", () => {
    const raw = [
      world({ id: "a", favoriteGroup: "worlds2" }),
      world({ id: "b", favoriteGroup: "worlds1" }),
      world({ id: "c", favoriteGroup: "worlds1" }),
    ];
    const sections = groupFavorites(raw, groups);
    expect(sections.map((s) => s.key)).toEqual(["worlds1", "worlds2"]);
    expect(sections[0]?.displayName).toBe("worlds1");
    expect(sections[0]?.worlds.map((w) => w.id)).toEqual(["b", "c"]);
    expect(sections[1]?.displayName).toBe("お出かけ用");
    expect(sections[1]?.worlds.map((w) => w.id)).toEqual(["a"]);
  });

  test("a known group with no favorites still gets an (empty) section", () => {
    const sections = groupFavorites([world({ id: "a", favoriteGroup: "worlds1" })], groups);
    expect(sections[1]?.key).toBe("worlds2");
    expect(sections[1]?.worlds).toEqual([]);
  });

  test("a favoriteGroup with no matching known group falls back to its own section instead of being dropped", () => {
    const raw = [
      world({ id: "a", favoriteGroup: "worlds1" }),
      world({ id: "z", favoriteGroup: "worlds9" }),
    ];
    const sections = groupFavorites(raw, groups);
    expect(sections.map((s) => s.key)).toEqual(["worlds1", "worlds2", "worlds9"]);
    expect(sections[2]?.displayName).toBe("worlds9");
    expect(sections[2]?.worlds.map((w) => w.id)).toEqual(["z"]);
  });

  test("total worlds across sections matches the input count (nothing dropped)", () => {
    const raw = [
      world({ id: "a", favoriteGroup: "worlds1" }),
      world({ id: "b", favoriteGroup: "unknown-group" }),
      world({ id: "c", favoriteGroup: "" }),
    ];
    const sections = groupFavorites(raw, groups);
    const total = sections.reduce((n, s) => n + s.worlds.length, 0);
    expect(total).toBe(3);
  });
});
