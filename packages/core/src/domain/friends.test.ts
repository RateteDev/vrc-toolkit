// Unit tests for the friends pure helpers (spec No.1 + No.2): parseLocation,
// instanceType, parseRegion, isJoinable, pickThumb, resolveThumbUrl and the
// toFriendSummary projection. Network-free.

import { describe, expect, it } from "bun:test";
import { resolveThumbUrl } from "./files";
import {
  instanceType,
  isJoinable,
  type ParsedLocation,
  parseLocation,
  parseRegion,
  pickThumb,
  toFriendSummary,
} from "./friends";

describe("parseLocation", () => {
  it("maps the 'offline' sentinel", () => {
    expect(parseLocation("offline")).toEqual({ kind: "offline" });
  });

  it("maps the 'private' sentinel", () => {
    expect(parseLocation("private")).toEqual({ kind: "private" });
  });

  it("maps the 'traveling' sentinel", () => {
    expect(parseLocation("traveling")).toEqual({ kind: "traveling" });
  });

  it("treats empty string as offline", () => {
    expect(parseLocation("")).toEqual({ kind: "offline" });
  });

  it("treats null/undefined as offline", () => {
    expect(parseLocation(null)).toEqual({ kind: "offline" });
    expect(parseLocation(undefined)).toEqual({ kind: "offline" });
  });

  it("splits a real location on the first ':' into worldId + instanceId", () => {
    const loc = "wrld_x:12345~hidden(usr_a)~region(eu)~nonce(abc)";
    expect(parseLocation(loc)).toEqual({
      kind: "instance",
      worldId: "wrld_x",
      instanceId: "12345~hidden(usr_a)~region(eu)~nonce(abc)",
    });
  });

  it("splits on the FIRST ':' only when the instanceId contains ':'", () => {
    const loc = "wrld_x:12345~region(eu):extra:bits";
    expect(parseLocation(loc)).toEqual({
      kind: "instance",
      worldId: "wrld_x",
      instanceId: "12345~region(eu):extra:bits",
    });
  });
});

describe("instanceType", () => {
  it("returns 'public' when no access tag is present", () => {
    expect(instanceType("12345~region(eu)~nonce(abc)")).toBe("public");
  });

  it("detects '~hidden(usr_)' as hidden (Friends+)", () => {
    expect(instanceType("12345~hidden(usr_a)~region(eu)")).toBe("hidden");
  });

  it("detects '~friends(usr_)' as friends", () => {
    expect(instanceType("12345~friends(usr_a)~region(eu)")).toBe("friends");
  });

  it("detects '~private(usr_)' as private", () => {
    expect(instanceType("12345~private(usr_a)~canRequestInvite")).toBe("private");
  });

  it("detects '~group(grp_)' as group", () => {
    expect(instanceType("12345~group(grp_a)~groupAccessType(public)")).toBe("group");
  });
});

describe("parseRegion", () => {
  it("reads the region code from a '~region(...)' tag", () => {
    expect(parseRegion("12345~hidden(usr_a)~region(eu)~nonce(abc)")).toBe("eu");
  });

  it("reads non-default region codes (jp/use/usw/usx)", () => {
    expect(parseRegion("12345~public~region(jp)")).toBe("jp");
    expect(parseRegion("12345~public~region(use)")).toBe("use");
    expect(parseRegion("12345~public~region(usw)")).toBe("usw");
    expect(parseRegion("12345~public~region(usx)")).toBe("usx");
  });

  it("returns null when no region tag is present (no implicit default)", () => {
    expect(parseRegion("12345~public")).toBe(null);
  });

  it("returns null for empty / nullish instanceId", () => {
    expect(parseRegion("")).toBe(null);
    expect(parseRegion(null)).toBe(null);
    expect(parseRegion(undefined)).toBe(null);
  });
});

describe("isJoinable", () => {
  const inst = (instanceId: string): ParsedLocation => ({
    kind: "instance",
    worldId: "wrld_x",
    instanceId,
  });

  it("public -> true", () => {
    expect(isJoinable(inst("12345~region(eu)"))).toBe(true);
  });

  it("friends -> true", () => {
    expect(isJoinable(inst("12345~friends(usr_a)~region(eu)"))).toBe(true);
  });

  it("hidden (Friends+) -> true", () => {
    expect(isJoinable(inst("12345~hidden(usr_a)~region(eu)"))).toBe(true);
  });

  it("private + canRequestInvite (Invite+) -> false", () => {
    expect(isJoinable(inst("12345~private(usr_a)~canRequestInvite"))).toBe(false);
  });

  it("private without canRequestInvite (Invite) -> false", () => {
    expect(isJoinable(inst("12345~private(usr_a)"))).toBe(false);
  });

  it("group(members) -> false", () => {
    expect(isJoinable(inst("12345~group(grp_a)~groupAccessType(members)"))).toBe(false);
  });

  it("group(plus) -> false", () => {
    expect(isJoinable(inst("12345~group(grp_a)~groupAccessType(plus)"))).toBe(false);
  });

  it("group(public) -> true", () => {
    expect(isJoinable(inst("12345~group(grp_a)~groupAccessType(public)"))).toBe(true);
  });

  it("sentinel offline -> false", () => {
    expect(isJoinable({ kind: "offline" })).toBe(false);
  });

  it("sentinel private -> false", () => {
    expect(isJoinable({ kind: "private" })).toBe(false);
  });

  it("sentinel traveling -> false", () => {
    expect(isJoinable({ kind: "traveling" })).toBe(false);
  });

  it("instance kind with worldId but missing instanceId -> false", () => {
    expect(isJoinable({ kind: "instance", worldId: "wrld_x" })).toBe(false);
  });
});

describe("pickThumb", () => {
  it("prefers a non-empty profilePicOverrideThumbnail", () => {
    expect(
      pickThumb({
        profilePicOverrideThumbnail: "https://i/override.png",
        currentAvatarThumbnailImageUrl: "https://i/avatar.png",
      }),
    ).toBe("https://i/override.png");
  });

  it("falls back to avatar thumbnail when override is an empty string", () => {
    expect(
      pickThumb({
        profilePicOverrideThumbnail: "",
        currentAvatarThumbnailImageUrl: "https://i/avatar.png",
      }),
    ).toBe("https://i/avatar.png");
  });

  it("falls back to avatar thumbnail when override is undefined", () => {
    expect(
      pickThumb({
        currentAvatarThumbnailImageUrl: "https://i/avatar.png",
      }),
    ).toBe("https://i/avatar.png");
  });

  it("returns null when neither is present", () => {
    expect(pickThumb({})).toBeNull();
  });
});

describe("resolveThumbUrl", () => {
  it("rewrites a VRChat file-hosted thumbnail to the same-origin proxy path", () => {
    expect(resolveThumbUrl("https://api.vrchat.cloud/api/1/file/file_abc-123/2/file")).toBe(
      "/api/file/file_abc-123/2",
    );
  });

  it("falls back to the raw https URL when it is not file-id-shaped", () => {
    expect(resolveThumbUrl("https://cdn.example.com/avatars/x.png")).toBe(
      "https://cdn.example.com/avatars/x.png",
    );
  });

  it("rejects a non-https override URL", () => {
    expect(resolveThumbUrl("http://insecure.example.com/x.png")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(resolveThumbUrl(null)).toBeNull();
  });
});

describe("toFriendSummary", () => {
  it("shapes an instance friend; worldName is left null for listFriends to fill", () => {
    const s = toFriendSummary({
      id: "usr_1",
      displayName: "Alice",
      status: "join me",
      statusDescription: "hi",
      location: "wrld_x:12345~hidden(usr_a)~region(eu)",
      currentAvatarThumbnailImageUrl: "https://api.vrchat.cloud/api/1/file/file_abc/1/file",
    });
    expect(s).toEqual({
      id: "usr_1",
      displayName: "Alice",
      status: "join me",
      statusDescription: "hi",
      isOnline: true,
      location: "wrld_x:12345~hidden(usr_a)~region(eu)",
      worldId: "wrld_x",
      worldName: null,
      instanceId: "12345~hidden(usr_a)~region(eu)",
      imageUrl: "/api/file/file_abc/1",
    });
  });

  it("marks an offline-sentinel friend as not online with no world", () => {
    const s = toFriendSummary({ id: "usr_2", location: "offline" });
    expect(s.isOnline).toBe(false);
    expect(s.worldId).toBeNull();
    expect(s.worldName).toBeNull();
    expect(s.instanceId).toBeNull();
  });
});
