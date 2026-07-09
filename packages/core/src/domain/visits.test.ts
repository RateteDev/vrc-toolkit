// Unit tests for the visit reconcile (spec No.9). PURE: reconcileVisits(
// openVisits, observed, now) takes plain arrays. reconcileVisits returns
// { toClose: id[], toOpen: row[], toContinue: id[] }.

import { describe, expect, it } from "bun:test";
import { type ObservedVisit, type OpenVisit, reconcileVisits } from "./visits";

const NOW = "2026-06-16T00:10:00.000Z";
const ENTERED = "2026-06-16T00:00:00.000Z";

function openVisit(over: Partial<OpenVisit> = {}): OpenVisit {
  return {
    id: 1,
    subjectId: "usr_a",
    worldId: "wrld_1",
    worldName: "Hangout",
    instanceId: "12345~public",
    instanceType: "public",
    region: "jp",
    enteredAt: ENTERED,
    leftAt: null,
    ...over,
  };
}

function observed(over: Partial<ObservedVisit> = {}): ObservedVisit {
  return {
    subjectId: "usr_a",
    worldId: "wrld_1",
    worldName: "Hangout",
    instanceId: "12345~public",
    instanceType: "public",
    region: "jp",
    ...over,
  };
}

describe("reconcileVisits", () => {
  it("continues an open interval when the subject is in the SAME instance", () => {
    const r = reconcileVisits([openVisit()], [observed()], NOW);
    expect(r.toContinue).toEqual([1]);
    expect(r.toClose).toEqual([]);
    expect(r.toOpen).toEqual([]);
  });

  it("closes the old interval and opens a new one when the subject MOVES", () => {
    const open = openVisit({ id: 7 });
    const moved = observed({
      worldId: "wrld_2",
      worldName: null,
      instanceId: "99~friends(usr_a)",
      instanceType: "friends",
    });
    const r = reconcileVisits([open], [moved], NOW);
    expect(r.toClose).toEqual([7]);
    expect(r.toContinue).toEqual([]);
    expect(r.toOpen).toHaveLength(1);
    expect(r.toOpen[0]).toEqual({
      subjectId: "usr_a",
      worldId: "wrld_2",
      worldName: null,
      instanceId: "99~friends(usr_a)",
      instanceType: "friends",
      region: "jp",
      enteredAt: NOW,
      leftAt: null,
    });
  });

  it("closes an open interval when the subject is no longer observed (left)", () => {
    const r = reconcileVisits([openVisit({ id: 3 })], [], NOW);
    expect(r.toClose).toEqual([3]);
    expect(r.toContinue).toEqual([]);
    expect(r.toOpen).toEqual([]);
  });

  it("opens a new interval on first observation (no matching open interval)", () => {
    const r = reconcileVisits([], [observed()], NOW);
    expect(r.toClose).toEqual([]);
    expect(r.toContinue).toEqual([]);
    expect(r.toOpen).toHaveLength(1);
    expect(r.toOpen[0]).toEqual({
      subjectId: "usr_a",
      worldId: "wrld_1",
      worldName: "Hangout",
      instanceId: "12345~public",
      instanceType: "public",
      region: "jp",
      enteredAt: NOW,
      leftAt: null,
    });
  });

  it("does NOT open a row for a traveling observation (null instanceId)", () => {
    const traveling = observed({ instanceId: null, instanceType: null });
    const r = reconcileVisits([], [traveling], NOW);
    expect(r.toOpen).toEqual([]);
    expect(r.toClose).toEqual([]);
    expect(r.toContinue).toEqual([]);
  });

  it("does not treat a traveling observation as continuing an open interval", () => {
    // A subject mid-travel (no instance) must not keep its old interval open;
    // it is left to close like any vanished observation.
    const traveling = observed({ instanceId: null, instanceType: null });
    const r = reconcileVisits([openVisit({ id: 5 })], [traveling], NOW);
    expect(r.toClose).toEqual([5]);
    expect(r.toContinue).toEqual([]);
    expect(r.toOpen).toEqual([]);
  });

  it("reconciles multiple subjects independently (one continues, one moves)", () => {
    const openA = openVisit({ id: 1, subjectId: "usr_a" });
    const openB = openVisit({
      id: 2,
      subjectId: "usr_b",
      worldId: "wrld_1",
      instanceId: "12345~public",
    });
    const stayA = observed({ subjectId: "usr_a" });
    const moveB = observed({
      subjectId: "usr_b",
      worldId: "wrld_3",
      worldName: null,
      instanceId: "7~public",
      instanceType: "public",
    });
    const r = reconcileVisits([openA, openB], [stayA, moveB], NOW);
    expect(r.toContinue).toEqual([1]);
    expect(r.toClose).toEqual([2]);
    expect(r.toOpen).toHaveLength(1);
    expect(r.toOpen[0]?.subjectId).toBe("usr_b");
    expect(r.toOpen[0]?.worldId).toBe("wrld_3");
    expect(r.toOpen[0]?.enteredAt).toBe(NOW);
  });

  it("returns empty decisions when there is nothing open and nothing observed", () => {
    expect(reconcileVisits([], [], NOW)).toEqual({
      toClose: [],
      toOpen: [],
      toContinue: [],
    });
  });
});
