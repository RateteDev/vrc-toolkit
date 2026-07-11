import { describe, expect, test } from "bun:test";
import {
  countByPresence,
  type FriendFilter,
  filterPeople,
  groupByWorld,
  sortPeople,
} from "./organize";
import type { Person } from "./people";

function person(over: Partial<Person>): Person {
  return {
    userId: "u",
    displayName: "X",
    imageUrl: null,
    isOnline: true,
    status: "active",
    statusDescription: "",
    // Public instance → joinable by default.
    location: "wrld_a:1~region(jp)",
    worldName: null,
    note: "",
    tags: [],
    localTags: [],
    ...over,
  };
}

const baseFilter: FriendFilter = {
  search: "",
  presence: "all",
};

describe("filterPeople", () => {
  const alice = person({ userId: "a", displayName: "Alice", status: "join me" });
  const bob = person({ userId: "b", displayName: "Bob", isOnline: false, location: "offline" });
  const carol = person({
    userId: "c",
    displayName: "Carol",
    status: "busy",
    location: "wrld_x:1~private(usr_a)",
  });
  const people = [alice, bob, carol];

  test("presence=online drops offline friends", () => {
    expect(
      filterPeople(people, { ...baseFilter, presence: "online" }).map((p) => p.userId),
    ).toEqual(["a", "c"]);
  });

  test("presence=joinable keeps only joinable instances", () => {
    // Carol is in a private instance → not joinable; Bob offline → not joinable.
    expect(
      filterPeople(people, { ...baseFilter, presence: "joinable" }).map((p) => p.userId),
    ).toEqual(["a"]);
  });

  test("search matches display name case-insensitively", () => {
    expect(filterPeople(people, { ...baseFilter, search: "car" }).map((p) => p.userId)).toEqual([
      "c",
    ]);
  });
});

describe("sortPeople", () => {
  test("status mode orders join me → active → ask me → busy → offline", () => {
    const people = [
      person({ userId: "busy", status: "busy" }),
      person({ userId: "off", isOnline: false, status: "" }),
      person({ userId: "join", status: "join me" }),
      person({ userId: "active", status: "active" }),
    ];
    expect(sortPeople(people, "status").map((p) => p.userId)).toEqual([
      "join",
      "active",
      "busy",
      "off",
    ]);
  });

  test("name mode sorts alphabetically", () => {
    const people = [person({ displayName: "Zoe" }), person({ displayName: "Amy" })];
    expect(sortPeople(people, "name").map((p) => p.displayName)).toEqual(["Amy", "Zoe"]);
  });
});

describe("groupByWorld", () => {
  test("groups instance friends by world, orders by size, others last", () => {
    const people = [
      person({ userId: "a1", location: "wrld_a:1~region(jp)" }),
      person({ userId: "b1", location: "wrld_b:1~region(jp)" }),
      person({ userId: "a2", location: "wrld_a:1~region(jp)" }),
      person({ userId: "priv", location: "private", isOnline: true }),
    ];
    const nameOf = (id: string | null | undefined) =>
      id === "wrld_a" ? "World A" : id === "wrld_b" ? "World B" : undefined;
    const groups = groupByWorld(people, nameOf);
    expect(groups.map((g) => g.key)).toEqual(["wrld_a", "wrld_b", "__other__"]);
    expect(groups[0]?.worldName).toBe("World A");
    expect(groups[0]?.members.map((p) => p.userId)).toEqual(["a1", "a2"]);
    expect(groups[2]?.members.map((p) => p.userId)).toEqual(["priv"]);
  });
});

describe("countByPresence", () => {
  test("counts joinable/online/all", () => {
    const people = [
      person({ status: "join me" }),
      person({ isOnline: false, location: "offline" }),
      person({ location: "wrld_x:1~private(usr_a)" }),
    ];
    expect(countByPresence(people)).toEqual({ joinable: 1, online: 2, all: 3 });
  });
});
