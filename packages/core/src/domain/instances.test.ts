import { describe, expect, it } from "bun:test";
import { parseInstanceAccess } from "./instances";

describe("parseInstanceAccess", () => {
  it("no access tag -> Public", () => {
    expect(parseInstanceAccess("wrld_x:12345~region(us)")).toEqual({
      kind: "public",
      label: "Public",
      region: "us",
      regionLabel: "US",
    });
  });

  it("~hidden(usr_) -> Friends+", () => {
    const result = parseInstanceAccess("wrld_x:12345~hidden(usr_a)~region(jp)");
    expect(result?.kind).toBe("friends-plus");
    expect(result?.label).toBe("Friends+");
  });

  it("~friends(usr_) -> Friends", () => {
    const result = parseInstanceAccess("wrld_x:12345~friends(usr_a)~region(eu)");
    expect(result?.kind).toBe("friends");
    expect(result?.label).toBe("Friends");
  });

  it("~private(usr_) without canRequestInvite -> Invite", () => {
    const result = parseInstanceAccess("wrld_x:12345~private(usr_a)~region(use)");
    expect(result?.kind).toBe("invite");
    expect(result?.label).toBe("Invite");
  });

  it("~private(usr_) with ~canRequestInvite -> Invite+", () => {
    const result = parseInstanceAccess("wrld_x:12345~private(usr_a)~canRequestInvite~region(use)");
    expect(result?.kind).toBe("invite-plus");
    expect(result?.label).toBe("Invite+");
  });

  it("~group(grp_) with ~groupAccessType(public) -> Group Public", () => {
    const result = parseInstanceAccess("wrld_x:12345~group(grp_a)~groupAccessType(public)");
    expect(result?.kind).toBe("group-public");
    expect(result?.label).toBe("Group Public");
  });

  it("~group(grp_) with ~groupAccessType(plus) -> Group+", () => {
    const result = parseInstanceAccess("wrld_x:12345~group(grp_a)~groupAccessType(plus)");
    expect(result?.kind).toBe("group-plus");
    expect(result?.label).toBe("Group+");
  });

  it("~group(grp_) with ~groupAccessType(members) -> Group", () => {
    const result = parseInstanceAccess("wrld_x:12345~group(grp_a)~groupAccessType(members)");
    expect(result?.kind).toBe("group");
    expect(result?.label).toBe("Group");
  });

  it("~group(grp_) with no groupAccessType tag -> Group", () => {
    const result = parseInstanceAccess("wrld_x:12345~group(grp_a)");
    expect(result?.kind).toBe("group");
    expect(result?.label).toBe("Group");
  });

  it("missing ~region(...) tag defaults region to 'us'", () => {
    const result = parseInstanceAccess("wrld_x:12345~hidden(usr_a)");
    expect(result?.region).toBe("us");
    expect(result?.regionLabel).toBe("US");
  });

  it("region token 'us' -> label 'US'", () => {
    const result = parseInstanceAccess("wrld_x:12345~region(us)");
    expect(result?.region).toBe("us");
    expect(result?.regionLabel).toBe("US");
  });

  it("region token 'use' -> label 'US East'", () => {
    const result = parseInstanceAccess("wrld_x:12345~region(use)");
    expect(result?.region).toBe("use");
    expect(result?.regionLabel).toBe("US East");
  });

  it("region token 'eu' -> label 'EU'", () => {
    const result = parseInstanceAccess("wrld_x:12345~region(eu)");
    expect(result?.region).toBe("eu");
    expect(result?.regionLabel).toBe("EU");
  });

  it("region token 'jp' -> label 'JP'", () => {
    const result = parseInstanceAccess("wrld_x:12345~region(jp)");
    expect(result?.region).toBe("jp");
    expect(result?.regionLabel).toBe("JP");
  });

  it("unknown region token falls back to the raw token as the label", () => {
    const result = parseInstanceAccess("wrld_x:12345~region(usw)");
    expect(result?.region).toBe("usw");
    expect(result?.regionLabel).toBe("usw");
  });

  it("non-instance location ('offline') -> null", () => {
    expect(parseInstanceAccess("offline")).toBeNull();
  });

  it("non-instance location ('private') -> null", () => {
    expect(parseInstanceAccess("private")).toBeNull();
  });

  it("non-instance location ('traveling') -> null", () => {
    expect(parseInstanceAccess("traveling")).toBeNull();
  });

  it("null/undefined location -> null", () => {
    expect(parseInstanceAccess(null)).toBeNull();
    expect(parseInstanceAccess(undefined)).toBeNull();
  });
});
