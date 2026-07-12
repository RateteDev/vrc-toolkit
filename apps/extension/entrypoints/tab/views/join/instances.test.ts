import { describe, expect, test } from "bun:test";
import type { VRChatInstance } from "@vrc-toolkit/core";
import type { Person } from "../friends/people";
import { groupMembersByInstance, toInstanceRowViewModel } from "./instances";

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

describe("toInstanceRowViewModel", () => {
  const row = {
    location: "wrld_1:11111~hidden(usr_a)~region(jp)",
    members: [person({ userId: "u1" })],
  };

  test("derives the access badge from the row's location", () => {
    const vm = toInstanceRowViewModel(row, undefined);
    expect(vm.access?.label).toBe("Friends+");
    expect(vm.access?.regionLabel).toBe("JP");
  });

  test("occupancy is null while the instance detail has not resolved yet", () => {
    const vm = toInstanceRowViewModel(row, undefined);
    expect(vm.occupancyLabel).toBeNull();
  });

  test("occupancy formats as 'n/capacity人' once both fields are known", () => {
    const instance: VRChatInstance = { n_users: 12, capacity: 32 };
    const vm = toInstanceRowViewModel(row, instance);
    expect(vm.occupancyLabel).toBe("12/32人");
  });

  test("occupancy stays null if only one of n_users/capacity is known", () => {
    expect(toInstanceRowViewModel(row, { n_users: 12 }).occupancyLabel).toBeNull();
    expect(toInstanceRowViewModel(row, { capacity: 32 }).occupancyLabel).toBeNull();
  });

  test("JOIN is enabled (no disabled reason) while the instance detail is still loading", () => {
    const vm = toInstanceRowViewModel(row, undefined);
    expect(vm.joinDisabledReason).toBeNull();
  });

  test("JOIN is disabled with a 満員 reason when hasCapacityForYou is false", () => {
    const vm = toInstanceRowViewModel(row, { hasCapacityForYou: false });
    expect(vm.joinDisabledReason).toBe("満員");
  });

  test("JOIN is disabled with a 年齢制限 reason when ageGate is true", () => {
    const vm = toInstanceRowViewModel(row, { ageGate: true });
    expect(vm.joinDisabledReason).toBe("年齢制限");
  });

  test("hasCapacityForYou false takes priority over ageGate true", () => {
    const vm = toInstanceRowViewModel(row, { hasCapacityForYou: false, ageGate: true });
    expect(vm.joinDisabledReason).toBe("満員");
  });

  test("JOIN is enabled when the instance detail carries no blocking flags", () => {
    const vm = toInstanceRowViewModel(row, { n_users: 1, capacity: 10, hasCapacityForYou: true });
    expect(vm.joinDisabledReason).toBeNull();
  });
});
