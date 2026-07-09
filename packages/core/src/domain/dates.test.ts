import { describe, expect, it } from "bun:test";
import { fmtDate } from "./dates";

describe("fmtDate", () => {
  it("formats a valid date to YYYY/MM/DD with zero-padding", () => {
    // fmtDate reads local-time getters, so build the input from local
    // components (not a UTC instant); the round trip through ISO and back
    // preserves the local wall-clock date under any TZ.
    const d = new Date(2026, 0, 5);
    expect(fmtDate(d.toISOString())).toBe("2026/01/05");
  });

  it("returns '' for falsy input", () => {
    expect(fmtDate(null)).toBe("");
    expect(fmtDate(undefined)).toBe("");
    expect(fmtDate("")).toBe("");
  });

  it("returns the first 10 chars for an unparseable string", () => {
    expect(fmtDate("not-a-date-at-all")).toBe("not-a-date");
    expect(fmtDate("0000-00-00-extra")).toBe("0000-00-00");
  });
});
