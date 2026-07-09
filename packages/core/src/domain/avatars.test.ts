// Unit tests for avatars pure helpers: paginateAll and fmtAvatar (spec No.22).
// Network-free: paginateAll is driven by an injected in-memory page fetcher.

import { describe, expect, it } from "bun:test";
import { fmtAvatar, paginateAll, type RawAvatar } from "./avatars";

// Build an in-memory page fetcher over a flat array. Records each requested
// offset so tests can assert the iteration plan (how many pages were fetched).
function pager<T>(all: T[], n: number): { fetchPage: (offset: number) => T[]; offsets: number[] } {
  const offsets: number[] = [];
  return {
    offsets,
    fetchPage(offset: number): T[] {
      offsets.push(offset);
      return all.slice(offset, offset + n);
    },
  };
}

describe("paginateAll", () => {
  it("accumulates all items across multiple full pages then a partial last page (60 items, n=25)", async () => {
    const all = Array.from({ length: 60 }, (_, i) => i);
    const p = pager(all, 25);
    const out = await paginateAll(25, p.fetchPage);
    expect(out).toEqual(all);
    // 25 + 25 + 10(<25, stop) -> offsets 0,25,50.
    expect(p.offsets).toEqual([0, 25, 50]);
  });

  it("stops on a full page boundary by issuing one extra empty page (50 items, n=25)", async () => {
    const all = Array.from({ length: 50 }, (_, i) => i);
    const p = pager(all, 25);
    const out = await paginateAll(25, p.fetchPage);
    expect(out).toEqual(all);
    // Last page returns exactly n, so a further page (empty, <n) is required to
    // detect the end: offsets 0,25,50.
    expect(p.offsets).toEqual([0, 25, 50]);
  });

  it("returns a single partial page without a second request (10 items, n=100)", async () => {
    const all = Array.from({ length: 10 }, (_, i) => i);
    const p = pager(all, 100);
    const out = await paginateAll(100, p.fetchPage);
    expect(out).toEqual(all);
    expect(p.offsets).toEqual([0]);
  });

  it("returns [] for 0 items after exactly one (empty) request", async () => {
    const p = pager<number>([], 100);
    const out = await paginateAll(100, p.fetchPage);
    expect(out).toEqual([]);
    expect(p.offsets).toEqual([0]);
  });

  it("awaits an async page fetcher", async () => {
    const all = Array.from({ length: 30 }, (_, i) => i);
    const out = await paginateAll(25, (offset) => Promise.resolve(all.slice(offset, offset + 25)));
    expect(out).toEqual(all);
  });
});

describe("fmtAvatar", () => {
  it("absorbs snake_case updated_at into camelCase updatedAt", () => {
    const raw: RawAvatar = {
      id: "avtr_1",
      name: "My Avatar",
      releaseStatus: "private",
      thumbnailImageUrl: "https://i/thumb.png",
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-06-01T12:00:00.000Z",
    };
    expect(fmtAvatar(raw)).toEqual({
      id: "avtr_1",
      name: "My Avatar",
      releaseStatus: "private",
      thumbnailImageUrl: "https://i/thumb.png",
      updatedAt: "2024-06-01T12:00:00.000Z",
    });
  });

  it("defaults missing fields to safe empties (no crash on sparse input)", () => {
    expect(fmtAvatar({})).toEqual({
      id: "",
      name: "",
      releaseStatus: "",
      thumbnailImageUrl: null,
      updatedAt: "",
    });
  });

  it("keeps the public releaseStatus value as-is", () => {
    const s = fmtAvatar({
      id: "avtr_2",
      name: "Pub",
      releaseStatus: "public",
      updated_at: "2025-02-02T00:00:00.000Z",
    });
    expect(s.releaseStatus).toBe("public");
    expect(s.updatedAt).toBe("2025-02-02T00:00:00.000Z");
    expect(s.thumbnailImageUrl).toBeNull();
  });
});
