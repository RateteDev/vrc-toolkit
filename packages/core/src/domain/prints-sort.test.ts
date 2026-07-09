// Unit tests for the prints pure helper sortPrints (spec No.26): mixed order ->
// createdAt descending, null createdAt sorts to the end, empty array.

import { describe, expect, it } from "bun:test";
import { type SortablePrint, sortPrints } from "./prints";

interface P extends SortablePrint {
  id: string;
  createdAt: string | null;
}

const p = (id: string, createdAt: string | null): P => ({ id, createdAt });

describe("sortPrints", () => {
  it("orders a mixed list by createdAt descending (newest first)", () => {
    const list: P[] = [
      p("b", "2024-03-01T00:00:00.000Z"),
      p("a", "2024-05-01T00:00:00.000Z"),
      p("c", "2024-01-01T00:00:00.000Z"),
      p("d", "2024-04-01T00:00:00.000Z"),
    ];
    expect(sortPrints(list).map((x) => x.id)).toEqual(["a", "d", "b", "c"]);
  });

  it("places entries with a null createdAt at the end, dated ones still sorted desc", () => {
    const list: P[] = [
      p("n1", null),
      p("y", "2024-02-01T00:00:00.000Z"),
      p("n2", null),
      p("x", "2024-06-01T00:00:00.000Z"),
    ];
    const ids = sortPrints(list).map((x) => x.id);
    expect(ids.slice(0, 2)).toEqual(["x", "y"]);
    expect(ids.slice(2).sort()).toEqual(["n1", "n2"]);
  });

  it("returns an empty array unchanged", () => {
    expect(sortPrints<P>([])).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const list: P[] = [p("a", "2024-01-01T00:00:00.000Z"), p("b", "2024-02-01T00:00:00.000Z")];
    const before = list.map((x) => x.id);
    sortPrints(list);
    expect(list.map((x) => x.id)).toEqual(before);
  });
});
