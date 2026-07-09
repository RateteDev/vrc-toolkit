// Unit tests for the server-side pure helper selectPrintsToDelete (spec No.29):
//   - keepLatest=10 over 12 prints -> the oldest 2 selected.
//   - maxAgeDays=30 boundary: exactly 30 days old kept, 31 days old deleted.
//   - both policies given -> OR semantics (delete if matching EITHER).
//   - createdAt null is kept (safe side), regardless of policy.

import { describe, expect, it } from "bun:test";
import type { VRChatPrint } from "../types";
import { type RotatablePrint, selectPrintsToDelete, toPrintSummary } from "./prints";

const NOW = new Date("2024-06-01T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

// Build a print whose createdAt is `daysAgo` before NOW.
function agePrint(id: string, daysAgo: number): RotatablePrint {
  return { id, createdAt: new Date(NOW.getTime() - daysAgo * DAY_MS).toISOString() };
}

describe("selectPrintsToDelete", () => {
  it("keepLatest=10 over 12 prints selects the oldest 2", () => {
    // daysAgo 1..12 -> newest is daysAgo=1, oldest is daysAgo=12.
    const prints = Array.from({ length: 12 }, (_, i) => agePrint(`p${i + 1}`, i + 1));
    const ids = selectPrintsToDelete(prints, { keepLatest: 10 }, NOW);
    // The two oldest are daysAgo=11 (p11) and daysAgo=12 (p12).
    expect(ids.sort()).toEqual(["p11", "p12"]);
  });

  it("keepLatest>=count deletes nothing", () => {
    const prints = Array.from({ length: 5 }, (_, i) => agePrint(`p${i}`, i + 1));
    expect(selectPrintsToDelete(prints, { keepLatest: 10 }, NOW)).toEqual([]);
  });

  it("maxAgeDays=30 keeps a print exactly 30 days old and deletes one 31 days old", () => {
    const prints: RotatablePrint[] = [agePrint("keep30", 30), agePrint("del31", 31)];
    expect(selectPrintsToDelete(prints, { maxAgeDays: 30 }, NOW)).toEqual(["del31"]);
  });

  it("maxAgeDays deletes everything strictly older than the threshold", () => {
    const prints: RotatablePrint[] = [
      agePrint("a", 10),
      agePrint("b", 29),
      agePrint("c", 30),
      agePrint("d", 45),
      agePrint("e", 100),
    ];
    expect(selectPrintsToDelete(prints, { maxAgeDays: 30 }, NOW).sort()).toEqual(["d", "e"]);
  });

  it("OR semantics: deletes a print matching EITHER keepLatest or maxAgeDays", () => {
    // 5 prints. keepLatest=3 alone would delete the 2 oldest (d,e).
    // maxAgeDays=20 alone would delete prints older than 20 days (c=25,d=40,e=60).
    // OR union -> {d,e} ∪ {c,d,e} = {c,d,e}.
    const prints: RotatablePrint[] = [
      agePrint("a", 1),
      agePrint("b", 5),
      agePrint("c", 25),
      agePrint("d", 40),
      agePrint("e", 60),
    ];
    const ids = selectPrintsToDelete(prints, { keepLatest: 3, maxAgeDays: 20 }, NOW);
    expect(ids.sort()).toEqual(["c", "d", "e"]);
  });

  it("keeps prints with a null createdAt (safe side) under keepLatest", () => {
    const prints: RotatablePrint[] = [
      { id: "n1", createdAt: null },
      agePrint("y1", 1),
      agePrint("y2", 2),
      agePrint("y3", 3),
    ];
    // keepLatest=1: dated prints beyond the newest are candidates, but null-dated
    // is always kept and never counts toward / against the "latest" window.
    const ids = selectPrintsToDelete(prints, { keepLatest: 1 }, NOW);
    expect(ids).not.toContain("n1");
  });

  it("keeps prints with a null createdAt under maxAgeDays", () => {
    const prints: RotatablePrint[] = [{ id: "n1", createdAt: null }, agePrint("old", 999)];
    const ids = selectPrintsToDelete(prints, { maxAgeDays: 30 }, NOW);
    expect(ids).toEqual(["old"]);
  });

  it("returns [] for an empty policy (no constraints)", () => {
    const prints: RotatablePrint[] = [agePrint("a", 100), agePrint("b", 200)];
    expect(selectPrintsToDelete(prints, {}, NOW)).toEqual([]);
  });

  it("returns [] for an empty print list", () => {
    expect(selectPrintsToDelete([], { keepLatest: 5, maxAgeDays: 30 }, NOW)).toEqual([]);
  });

  // Lock the preview-vs-execution symmetry: rotate() selects over
  // toPrintSummary(raw), and toPrintSummary derives createdAt as
  // `createdAt ?? timestamp`. A raw print dated ONLY via `timestamp` must
  // therefore be selectable by the server exactly as the gallery/preview shows
  // it, not silently kept. (Mirrors rotate()'s projection.)
  it("selects a print dated only via `timestamp` after toPrintSummary projection", () => {
    const oldIso = new Date(NOW.getTime() - 999 * DAY_MS).toISOString();
    const raw: VRChatPrint[] = [
      { id: "ts-only", timestamp: oldIso },
      { id: "dated", createdAt: agePrint("dated", 1).createdAt as string },
    ];
    const ids = selectPrintsToDelete(raw.map(toPrintSummary), { maxAgeDays: 30 }, NOW);
    expect(ids).toEqual(["ts-only"]);
  });
});
