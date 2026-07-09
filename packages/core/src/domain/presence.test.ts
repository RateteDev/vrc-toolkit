// Unit tests for the presence diff (spec No.3). PURE: diffPresence(prev, now)
// and computeIsOnline(status, location) take plain arrays / strings.

import { describe, expect, it } from "bun:test";
import { computeIsOnline, diffPresence, type Presence } from "./presence";

const T = "2026-06-16T00:05:00.000Z";

function online(over: Partial<Presence> = {}): Presence {
  return {
    userId: "usr_a",
    displayName: "Alice",
    status: "active",
    isOnline: true,
    location: "wrld_1:12345~public",
    worldId: "wrld_1",
    instanceId: "12345~public",
    observedAt: T,
    ...over,
  };
}

describe("computeIsOnline", () => {
  it("is true for an active status in a real instance location", () => {
    expect(computeIsOnline("active", "wrld_1:12345~public")).toBe(true);
  });

  it("is true for join me / busy / ask me when in an instance", () => {
    expect(computeIsOnline("join me", "wrld_1:1~public")).toBe(true);
    expect(computeIsOnline("busy", "wrld_1:1~public")).toBe(true);
    expect(computeIsOnline("ask me", "wrld_1:1~public")).toBe(true);
  });

  it("is false when status is offline", () => {
    expect(computeIsOnline("offline", "wrld_1:12345~public")).toBe(false);
  });

  it("is false when location is the offline sentinel", () => {
    expect(computeIsOnline("active", "offline")).toBe(false);
  });

  it("is false when location is empty (unparsed sentinel)", () => {
    expect(computeIsOnline("active", "")).toBe(false);
  });

  it("is true on the web-only 'private' sentinel? — treated as online (status non-offline)", () => {
    // A friend on the website shows location 'private' but is still online.
    expect(computeIsOnline("active", "private")).toBe(true);
  });
});

describe("diffPresence", () => {
  it("appends a newly online friend not present in prev", () => {
    const now = [online()];
    expect(diffPresence([], now, T)).toEqual(now);
  });

  it("appends all rows on the first run (prev empty)", () => {
    const now = [online(), online({ userId: "usr_b", displayName: "Bob" })];
    expect(diffPresence([], now, T)).toEqual(now);
  });

  it("appends a row when status changes (active -> join me)", () => {
    const prev = [online({ status: "active" })];
    const changed = online({ status: "join me" });
    expect(diffPresence(prev, [changed], T)).toEqual([changed]);
  });

  it("appends a row when location changes (moved instance)", () => {
    const prev = [online({ location: "wrld_1:1~public", instanceId: "1~public" })];
    const moved = online({
      location: "wrld_2:9~friends(usr_a)",
      worldId: "wrld_2",
      instanceId: "9~friends(usr_a)",
    });
    expect(diffPresence(prev, [moved], T)).toEqual([moved]);
  });

  it("appends nothing when nothing changed", () => {
    const prev = [online()];
    const now = [online()];
    expect(diffPresence(prev, now, T)).toEqual([]);
  });

  it("appends an offline row when a friend drops out of the online set", () => {
    const prev = [online()];
    const rows = diffPresence(prev, [], T);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.userId).toBe("usr_a");
    expect(rows[0]?.status).toBe("offline");
    expect(rows[0]?.isOnline).toBe(false);
  });

  it("stamps the offline row at the RUN's observedAt when now is empty", () => {
    // prev was observed at an earlier run time; every friend dropped offline
    // in this poll so `now` is empty. The synthesized offline row must carry
    // the CURRENT run time (RUN), not the stale prev.observedAt (T).
    const RUN = "2026-06-16T00:10:00.000Z";
    const prev = [online({ observedAt: T })];
    const rows = diffPresence(prev, [], RUN);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.observedAt).toBe(RUN);
  });

  it("appends only the changed friend, leaving unchanged friends out", () => {
    const prev = [online(), online({ userId: "usr_b", displayName: "Bob", status: "active" })];
    const now = [online(), online({ userId: "usr_b", displayName: "Bob", status: "busy" })];
    const rows = diffPresence(prev, now, T);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.userId).toBe("usr_b");
    expect(rows[0]?.status).toBe("busy");
  });

  it("returns nothing when both prev and now are empty", () => {
    expect(diffPresence([], [], T)).toEqual([]);
  });
});
