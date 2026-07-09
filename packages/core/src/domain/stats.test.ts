// Unit tests for the activity-stats pure aggregations (spec No.32).
//   - aggregateWorldMinutes: per-world stay minutes; leftAt=null counts to now.
//   - onlineByHour: 24-element histogram by local hour (UTC + tz offset).
//   - rankFriendsByOnline: descending online count, displayName-asc tiebreak.

import { describe, expect, it } from "bun:test";
import {
  aggregateWorldMinutes,
  onlineByHour,
  rankFriendsByOnline,
  type StatPresence,
  type StatVisit,
} from "./stats";

function visit(over: Partial<StatVisit> = {}): StatVisit {
  return {
    worldId: "wrld_1",
    worldName: "World One",
    enteredAt: "2026-06-16T00:00:00.000Z",
    leftAt: "2026-06-16T01:00:00.000Z",
    ...over,
  };
}

function presence(over: Partial<StatPresence> = {}): StatPresence {
  return {
    userId: "usr_a",
    displayName: "Alice",
    isOnline: true,
    observedAt: "2026-06-16T00:00:00.000Z",
    ...over,
  };
}

describe("aggregateWorldMinutes", () => {
  it("single closed interval -> its duration in minutes", () => {
    const out = aggregateWorldMinutes(
      [
        visit({
          enteredAt: "2026-06-16T00:00:00.000Z",
          leftAt: "2026-06-16T01:30:00.000Z",
        }),
      ],
      "2026-06-16T05:00:00.000Z",
    );
    expect(out).toEqual([{ worldId: "wrld_1", worldName: "World One", minutes: 90 }]);
  });

  it("multiple intervals in the same world are summed into one entry", () => {
    const out = aggregateWorldMinutes(
      [
        visit({
          enteredAt: "2026-06-16T00:00:00.000Z",
          leftAt: "2026-06-16T00:30:00.000Z",
        }),
        visit({
          enteredAt: "2026-06-16T02:00:00.000Z",
          leftAt: "2026-06-16T02:45:00.000Z",
        }),
      ],
      "2026-06-16T05:00:00.000Z",
    );
    expect(out).toEqual([{ worldId: "wrld_1", worldName: "World One", minutes: 75 }]);
  });

  it("distinct worlds become separate entries, sorted by minutes descending", () => {
    const out = aggregateWorldMinutes(
      [
        visit({
          worldId: "wrld_short",
          worldName: "Short",
          enteredAt: "2026-06-16T00:00:00.000Z",
          leftAt: "2026-06-16T00:10:00.000Z",
        }),
        visit({
          worldId: "wrld_long",
          worldName: "Long",
          enteredAt: "2026-06-16T00:00:00.000Z",
          leftAt: "2026-06-16T02:00:00.000Z",
        }),
      ],
      "2026-06-16T05:00:00.000Z",
    );
    expect(out).toEqual([
      { worldId: "wrld_long", worldName: "Long", minutes: 120 },
      { worldId: "wrld_short", worldName: "Short", minutes: 10 },
    ]);
  });

  it("open interval (leftAt null) is counted up to now", () => {
    const out = aggregateWorldMinutes(
      [
        visit({
          enteredAt: "2026-06-16T04:00:00.000Z",
          leftAt: null,
        }),
      ],
      "2026-06-16T05:00:00.000Z",
    );
    expect(out).toEqual([{ worldId: "wrld_1", worldName: "World One", minutes: 60 }]);
  });

  it("a closed and an open interval in the same world are summed", () => {
    const out = aggregateWorldMinutes(
      [
        visit({
          enteredAt: "2026-06-16T00:00:00.000Z",
          leftAt: "2026-06-16T00:20:00.000Z",
        }),
        visit({
          enteredAt: "2026-06-16T04:30:00.000Z",
          leftAt: null,
        }),
      ],
      "2026-06-16T05:00:00.000Z",
    );
    expect(out).toEqual([{ worldId: "wrld_1", worldName: "World One", minutes: 50 }]);
  });

  it("empty input -> empty array", () => {
    expect(aggregateWorldMinutes([], "2026-06-16T05:00:00.000Z")).toEqual([]);
  });
});

describe("onlineByHour", () => {
  it("known UTC timestamps fall into their UTC hour bins at tz=0", () => {
    const out = onlineByHour(
      [
        presence({ observedAt: "2026-06-16T00:30:00.000Z" }),
        presence({ observedAt: "2026-06-16T09:05:00.000Z" }),
        presence({ observedAt: "2026-06-16T09:55:00.000Z" }),
        presence({ observedAt: "2026-06-16T23:10:00.000Z" }),
      ],
      0,
    );
    const expected = new Array(24).fill(0);
    expected[0] = 1;
    expected[9] = 2;
    expected[23] = 1;
    expect(out).toEqual(expected);
  });

  it("ignores offline rows", () => {
    const out = onlineByHour(
      [
        presence({ observedAt: "2026-06-16T05:00:00.000Z", isOnline: true }),
        presence({ observedAt: "2026-06-16T05:30:00.000Z", isOnline: false }),
      ],
      0,
    );
    const expected = new Array(24).fill(0);
    expected[5] = 1;
    expect(out).toEqual(expected);
  });

  it("positive tz offset shifts forward and wraps past midnight (day-cross)", () => {
    const out = onlineByHour([presence({ observedAt: "2026-06-16T20:00:00.000Z" })], 9);
    const expected = new Array(24).fill(0);
    expected[5] = 1;
    expect(out).toEqual(expected);
  });

  it("negative tz offset shifts backward and wraps before midnight (day-cross)", () => {
    const out = onlineByHour([presence({ observedAt: "2026-06-16T02:00:00.000Z" })], -5);
    const expected = new Array(24).fill(0);
    expected[21] = 1;
    expect(out).toEqual(expected);
  });

  it("empty input -> 24 zeros", () => {
    expect(onlineByHour([], 0)).toEqual(new Array(24).fill(0));
  });
});

describe("rankFriendsByOnline", () => {
  it("orders by online count descending", () => {
    const out = rankFriendsByOnline([
      presence({ userId: "usr_a", displayName: "Alice" }),
      presence({ userId: "usr_b", displayName: "Bob" }),
      presence({ userId: "usr_b", displayName: "Bob" }),
      presence({ userId: "usr_b", displayName: "Bob" }),
      presence({ userId: "usr_c", displayName: "Carol" }),
      presence({ userId: "usr_c", displayName: "Carol" }),
    ]);
    expect(out).toEqual([
      { userId: "usr_b", displayName: "Bob", minutes: 3 },
      { userId: "usr_c", displayName: "Carol", minutes: 2 },
      { userId: "usr_a", displayName: "Alice", minutes: 1 },
    ]);
  });

  it("does not count offline observations", () => {
    const out = rankFriendsByOnline([
      presence({ userId: "usr_a", displayName: "Alice", isOnline: true }),
      presence({ userId: "usr_a", displayName: "Alice", isOnline: false }),
      presence({ userId: "usr_b", displayName: "Bob", isOnline: false }),
    ]);
    expect(out).toEqual([{ userId: "usr_a", displayName: "Alice", minutes: 1 }]);
  });

  it("breaks ties on equal counts by displayName ascending", () => {
    const out = rankFriendsByOnline([
      presence({ userId: "usr_z", displayName: "Zoe" }),
      presence({ userId: "usr_a", displayName: "Anna" }),
      presence({ userId: "usr_m", displayName: "Mia" }),
    ]);
    expect(out).toEqual([
      { userId: "usr_a", displayName: "Anna", minutes: 1 },
      { userId: "usr_m", displayName: "Mia", minutes: 1 },
      { userId: "usr_z", displayName: "Zoe", minutes: 1 },
    ]);
  });

  it("empty input -> empty array", () => {
    expect(rankFriendsByOnline([])).toEqual([]);
  });
});
