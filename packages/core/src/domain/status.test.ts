// Unit tests for the status pure helper validateStatus (spec No.5): the five
// valid enum values pass through; 'askMe'/'join_me'/garbage are rejected;
// statusDescription is passed through unmodified (no maxLength per spec).

import { describe, expect, it } from "bun:test";
import { type VrcStatus, validateStatus } from "./status";

describe("validateStatus", () => {
  const valid: VrcStatus[] = ["active", "ask me", "busy", "join me", "offline"];

  for (const status of valid) {
    it(`passes through the valid status '${status}'`, () => {
      expect(validateStatus({ status, statusDescription: "hi" })).toEqual({
        status,
        statusDescription: "hi",
      });
    });
  }

  it("rejects the camelCase variant 'askMe'", () => {
    expect(() => validateStatus({ status: "askMe", statusDescription: "" })).toThrow();
  });

  it("rejects the underscore variant 'join_me'", () => {
    expect(() => validateStatus({ status: "join_me", statusDescription: "" })).toThrow();
  });

  it("rejects garbage status", () => {
    expect(() => validateStatus({ status: "garbage", statusDescription: "" })).toThrow();
  });

  it("rejects an empty status string", () => {
    expect(() => validateStatus({ status: "", statusDescription: "" })).toThrow();
  });

  it("rejects a status differing only by case ('Active')", () => {
    expect(() => validateStatus({ status: "Active", statusDescription: "" })).toThrow();
  });

  it("passes statusDescription through unmodified (no trimming)", () => {
    const desc = "  spaced  description  ";
    expect(validateStatus({ status: "active", statusDescription: desc }).statusDescription).toBe(
      desc,
    );
  });

  it("passes an empty statusDescription through unmodified", () => {
    expect(validateStatus({ status: "busy", statusDescription: "" }).statusDescription).toBe("");
  });

  it("does not impose a maxLength on statusDescription", () => {
    const long = "x".repeat(500);
    expect(validateStatus({ status: "join me", statusDescription: long }).statusDescription).toBe(
      long,
    );
  });
});
