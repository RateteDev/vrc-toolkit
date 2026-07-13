import { describe, expect, test } from "bun:test";
import {
  fmtGroupInstance,
  fmtGroupPost,
  fmtUserGroup,
  type GroupSummary,
  groupIdFromLocation,
  hasUnreadPost,
  instancesForGroup,
  sortGroups,
} from "./groups";

describe("fmtUserGroup", () => {
  test("narrows a full raw group, preferring groupId and building the tag", () => {
    const s = fmtUserGroup({
      id: "grp_other",
      groupId: "grp_1",
      name: "月見の会",
      shortCode: "MOON",
      discriminator: "4821",
      iconUrl: "https://x/icon.png",
      memberCount: 128,
      isRepresenting: true,
      lastPostCreatedAt: "2026-07-13T10:00:00Z",
      lastPostReadAt: "2026-07-12T09:00:00Z",
    });
    expect(s.id).toBe("grp_1");
    expect(s.name).toBe("月見の会");
    expect(s.iconUrl).toBe("https://x/icon.png");
    expect(s.memberCount).toBe(128);
    expect(s.isRepresenting).toBe(true);
    expect(s.tag).toBe("MOON#4821");
    expect(s.lastPostCreatedAt).toEqual(new Date("2026-07-13T10:00:00Z"));
    expect(s.lastPostReadAt).toEqual(new Date("2026-07-12T09:00:00Z"));
  });

  test("falls back to id, and empties the tag / nulls dates on missing fields", () => {
    const s = fmtUserGroup({ id: "grp_x", shortCode: "ONLY" });
    expect(s.id).toBe("grp_x");
    expect(s.tag).toBe("");
    expect(s.memberCount).toBeNull();
    expect(s.isRepresenting).toBe(false);
    expect(s.iconUrl).toBeNull();
    expect(s.lastPostCreatedAt).toBeNull();
    expect(s.lastPostReadAt).toBeNull();
  });

  test("treats an unparseable date as null", () => {
    const s = fmtUserGroup({ groupId: "grp_1", lastPostCreatedAt: "not-a-date" });
    expect(s.lastPostCreatedAt).toBeNull();
  });
});

// Build a summary with just the fields the unread/sort logic reads.
function group(over: Partial<GroupSummary>): GroupSummary {
  return {
    id: "grp",
    name: "",
    iconUrl: null,
    memberCount: null,
    isRepresenting: false,
    shortCode: "",
    discriminator: "",
    tag: "",
    lastPostCreatedAt: null,
    lastPostReadAt: null,
    ...over,
  };
}

describe("hasUnreadPost", () => {
  test("false when the group has no post", () => {
    expect(hasUnreadPost(group({}))).toBe(false);
  });

  test("true when a post exists and was never read", () => {
    expect(hasUnreadPost(group({ lastPostCreatedAt: new Date("2026-07-13T00:00:00Z") }))).toBe(
      true,
    );
  });

  test("true when the last read is older than the last post", () => {
    expect(
      hasUnreadPost(
        group({
          lastPostCreatedAt: new Date("2026-07-13T10:00:00Z"),
          lastPostReadAt: new Date("2026-07-13T09:00:00Z"),
        }),
      ),
    ).toBe(true);
  });

  test("false when the last read is at or after the last post", () => {
    const at = new Date("2026-07-13T10:00:00Z");
    expect(hasUnreadPost(group({ lastPostCreatedAt: at, lastPostReadAt: at }))).toBe(false);
  });
});

describe("sortGroups", () => {
  test("orders unread first, then recent posts desc, then post-less by name", () => {
    const unread = group({
      id: "unread",
      name: "zeta",
      lastPostCreatedAt: new Date("2026-07-10T00:00:00Z"),
    });
    const recentRead = group({
      id: "recent",
      name: "alpha",
      lastPostCreatedAt: new Date("2026-07-13T00:00:00Z"),
      lastPostReadAt: new Date("2026-07-14T00:00:00Z"),
    });
    const olderRead = group({
      id: "older",
      name: "beta",
      lastPostCreatedAt: new Date("2026-07-11T00:00:00Z"),
      lastPostReadAt: new Date("2026-07-14T00:00:00Z"),
    });
    const noPostB = group({ id: "nb", name: "banana" });
    const noPostA = group({ id: "na", name: "apple" });

    const sorted = sortGroups([noPostB, olderRead, unread, noPostA, recentRead]);
    expect(sorted.map((g) => g.id)).toEqual(["unread", "recent", "older", "na", "nb"]);
  });

  test("does not mutate the input", () => {
    const input = [group({ id: "a", name: "b" }), group({ id: "b", name: "a" })];
    const copy = [...input];
    sortGroups(input);
    expect(input).toEqual(copy);
  });
});

describe("fmtGroupPost", () => {
  test("keeps raw newlines in text and parses the date", () => {
    const p = fmtGroupPost({
      id: "gpo_1",
      title: "お知らせ",
      text: "line1\nline2",
      imageUrl: "https://x/img.png",
      createdAt: "2026-07-13T00:00:00Z",
    });
    expect(p).toEqual({
      id: "gpo_1",
      title: "お知らせ",
      text: "line1\nline2",
      imageUrl: "https://x/img.png",
      createdAt: new Date("2026-07-13T00:00:00Z"),
    });
  });

  test("defaults missing fields", () => {
    const p = fmtGroupPost({});
    expect(p).toEqual({ id: "", title: "", text: "", imageUrl: null, createdAt: null });
  });
});

describe("groupIdFromLocation", () => {
  test("extracts the grp_ id from the group tag", () => {
    expect(
      groupIdFromLocation("wrld_x:65781~group(grp_y)~groupAccessType(public)~region(jp)"),
    ).toBe("grp_y");
  });

  test("null for a non-group location", () => {
    expect(groupIdFromLocation("wrld_x:12345~region(us)")).toBeNull();
  });

  test("null for empty / nullish input", () => {
    expect(groupIdFromLocation("")).toBeNull();
    expect(groupIdFromLocation(null)).toBeNull();
    expect(groupIdFromLocation(undefined)).toBeNull();
  });
});

describe("fmtGroupInstance", () => {
  test("narrows a full instance and derives the owning group", () => {
    const v = fmtGroupInstance({
      location: "wrld_x:1~group(grp_y)~region(jp)",
      name: "instance-name",
      userCount: 12,
      capacity: 40,
      world: {
        name: "月の海",
        thumbnailImageUrl: "https://x/thumb.png",
        imageUrl: "https://x/i.png",
      },
    });
    expect(v).toEqual({
      location: "wrld_x:1~group(grp_y)~region(jp)",
      worldName: "月の海",
      worldThumbnailUrl: "https://x/thumb.png",
      userCount: 12,
      capacity: 40,
      groupId: "grp_y",
    });
  });

  test("falls back to instance name and imageUrl, nulls missing counts", () => {
    const v = fmtGroupInstance({
      location: "wrld_x:1~group(grp_y)",
      name: "fallback",
      world: { imageUrl: "https://x/i.png" },
    });
    expect(v.worldName).toBe("fallback");
    expect(v.worldThumbnailUrl).toBe("https://x/i.png");
    expect(v.userCount).toBeNull();
    expect(v.capacity).toBeNull();
  });
});

describe("instancesForGroup", () => {
  test("keeps only instances owned by the given group", () => {
    const instances = [
      fmtGroupInstance({ location: "wrld_a:1~group(grp_1)" }),
      fmtGroupInstance({ location: "wrld_b:2~group(grp_2)" }),
      fmtGroupInstance({ location: "wrld_c:3~group(grp_1)" }),
      fmtGroupInstance({ location: "wrld_d:4~region(us)" }),
    ];
    const mine = instancesForGroup("grp_1", instances);
    expect(mine.map((i) => i.location)).toEqual(["wrld_a:1~group(grp_1)", "wrld_c:3~group(grp_1)"]);
  });
});
