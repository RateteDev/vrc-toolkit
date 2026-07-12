import { describe, expect, test } from "bun:test";
import { applyNoteUpdate, type Person } from "./people";

function person(over: Partial<Person>): Person {
  return {
    userId: "u",
    displayName: "X",
    imageUrl: null,
    isOnline: true,
    status: "active",
    statusDescription: "",
    location: "wrld_a:1~region(jp)",
    worldName: null,
    note: "",
    tags: [],
    localTags: [],
    ...over,
  };
}

describe("applyNoteUpdate", () => {
  const alice = person({ userId: "a", displayName: "Alice", note: "old" });
  const bob = person({ userId: "b", displayName: "Bob" });
  const offlineNoted = person({
    userId: "c",
    displayName: "Carol",
    isOnline: false,
    location: "",
    note: "keep in touch",
  });

  test("replaces the target's note and leaves others untouched", () => {
    const next = applyNoteUpdate([alice, bob], "a", "new");
    expect(next.map((p) => p.note)).toEqual(["new", ""]);
    expect(next[1]).toBe(bob);
  });

  test("does not mutate the input list or its people", () => {
    const input = [alice];
    const next = applyNoteUpdate(input, "a", "new");
    expect(alice.note).toBe("old");
    expect(next).not.toBe(input);
    expect(next[0]).not.toBe(alice);
  });

  test("clearing the note on an offline note-only row removes the row", () => {
    // Mirrors buildPeople: a note-only (offline) row exists solely to show its
    // note, so a full reload after deletion would not produce it either.
    const next = applyNoteUpdate([alice, offlineNoted], "c", "");
    expect(next.map((p) => p.userId)).toEqual(["a"]);
  });

  test("clearing the note on an online friend keeps the row", () => {
    const next = applyNoteUpdate([alice], "a", "");
    expect(next.map((p) => p.userId)).toEqual(["a"]);
    expect(next[0]?.note).toBe("");
  });

  test("an unknown userId is a no-op on the list contents", () => {
    const next = applyNoteUpdate([alice, bob], "zzz", "x");
    expect(next).toEqual([alice, bob]);
  });
});
