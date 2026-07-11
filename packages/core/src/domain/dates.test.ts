import { describe, expect, it } from "bun:test";
import { fmtDate, fmtDateTime, fmtRelative } from "./dates";

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

describe("fmtDateTime", () => {
  it("formats a valid instant to YYYY/MM/DD HH:MM with zero-padding", () => {
    const d = new Date(2026, 6, 5, 9, 3);
    expect(fmtDateTime(d.toISOString())).toBe("2026/07/05 09:03");
  });

  it("returns '' for falsy input", () => {
    expect(fmtDateTime(null)).toBe("");
    expect(fmtDateTime(undefined)).toBe("");
    expect(fmtDateTime("")).toBe("");
  });

  it("returns the first 10 chars for an unparseable string", () => {
    expect(fmtDateTime("not-a-date-at-all")).toBe("not-a-date");
  });
});

describe("fmtRelative", () => {
  const now = new Date(2026, 6, 12, 12, 0, 0);

  it("returns 分前 under an hour", () => {
    expect(fmtRelative(new Date(2026, 6, 12, 11, 59).toISOString(), now)).toBe("1分前");
    expect(fmtRelative(new Date(2026, 6, 12, 11, 1).toISOString(), now)).toBe("59分前");
  });

  it("returns たった今 under a minute", () => {
    expect(fmtRelative(new Date(2026, 6, 12, 11, 59, 30).toISOString(), now)).toBe("たった今");
    expect(fmtRelative(now.toISOString(), now)).toBe("たった今");
  });

  it("returns 時間前 under a day", () => {
    expect(fmtRelative(new Date(2026, 6, 12, 11, 0).toISOString(), now)).toBe("1時間前");
    expect(fmtRelative(new Date(2026, 6, 11, 12, 1).toISOString(), now)).toBe("23時間前");
  });

  it("returns 日前 up to 30 days", () => {
    expect(fmtRelative(new Date(2026, 6, 11, 12, 0).toISOString(), now)).toBe("1日前");
    expect(fmtRelative(new Date(2026, 5, 12, 12, 0).toISOString(), now)).toBe("30日前");
  });

  it("returns null beyond 30 days (caller falls back to the absolute date)", () => {
    expect(fmtRelative(new Date(2026, 5, 11, 12, 0).toISOString(), now)).toBeNull();
    expect(fmtRelative(new Date(2019, 2, 4).toISOString(), now)).toBeNull();
  });

  it("returns null for future instants (clock skew must not render 前)", () => {
    expect(fmtRelative(new Date(2026, 6, 12, 12, 5).toISOString(), now)).toBeNull();
  });

  it("returns null for falsy or unparseable input", () => {
    expect(fmtRelative("", now)).toBeNull();
    expect(fmtRelative(null, now)).toBeNull();
    expect(fmtRelative("not-a-date", now)).toBeNull();
  });
});
