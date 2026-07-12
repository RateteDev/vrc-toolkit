import { describe, expect, test } from "bun:test";
import type { Person } from "../friends/people";
import { groupMembersByInstance } from "./instances";

function person(overrides: Partial<Person>): Person {
  return {
    userId: "usr_1",
    displayName: "Alice",
    imageUrl: null,
    isOnline: true,
    status: "active",
    statusDescription: "",
    location: "wrld_1:11111",
    worldName: "Test World",
    note: "",
    tags: [],
    localTags: [],
    ...overrides,
  };
}

describe("groupMembersByInstance", () => {
  test("groups members that share the exact location string", () => {
    const members = [
      person({ userId: "u1", location: "wrld_1:11111" }),
      person({ userId: "u2", location: "wrld_1:22222" }),
      person({ userId: "u3", location: "wrld_1:11111" }),
    ];
    const rows = groupMembersByInstance(members);
    expect(rows).toHaveLength(2);
    const byLocation = new Map(rows.map((r) => [r.location, r.members.map((m) => m.userId)]));
    expect(byLocation.get("wrld_1:11111")).toEqual(["u1", "u3"]);
    expect(byLocation.get("wrld_1:22222")).toEqual(["u2"]);
  });

  test("sorts rows by descending member count", () => {
    const members = [
      person({ userId: "u1", location: "wrld_1:aaa" }),
      person({ userId: "u2", location: "wrld_1:bbb" }),
      person({ userId: "u3", location: "wrld_1:bbb" }),
      person({ userId: "u4", location: "wrld_1:bbb" }),
    ];
    const rows = groupMembersByInstance(members);
    expect(rows.map((r) => r.location)).toEqual(["wrld_1:bbb", "wrld_1:aaa"]);
  });

  test("keeps incoming member order within a row", () => {
    const members = [
      person({ userId: "u1", displayName: "Bob", location: "wrld_1:aaa" }),
      person({ userId: "u2", displayName: "Alice", location: "wrld_1:aaa" }),
    ];
    const rows = groupMembersByInstance(members);
    expect(rows[0]?.members.map((m) => m.displayName)).toEqual(["Bob", "Alice"]);
  });

  test("empty input yields no rows", () => {
    expect(groupMembersByInstance([])).toEqual([]);
  });
});
