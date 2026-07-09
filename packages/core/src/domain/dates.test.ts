import { describe, expect, it } from "bun:test";
import { fmtDate } from "./dates";

describe("fmtDate", () => {
  it("formats a valid ISO string to YYYY/MM/DD with zero-padding", () => {
    expect(fmtDate("2026-01-05T00:00:00.000Z")).toBe("2026/01/05");
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
