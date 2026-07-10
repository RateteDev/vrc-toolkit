import { describe, expect, test } from "bun:test";
import { deriveTrustRank, TRUST_RANK_LABELS } from "./trust";

describe("deriveTrustRank", () => {
  test("no trust tag → visitor", () => {
    expect(deriveTrustRank(["language_jpn"])).toBe("visitor");
    expect(deriveTrustRank([])).toBe("visitor");
    expect(deriveTrustRank(undefined)).toBe("visitor");
  });

  test("maps each trust tag to its conferred rank", () => {
    expect(deriveTrustRank(["system_trust_basic"])).toBe("new");
    expect(deriveTrustRank(["system_trust_known"])).toBe("user");
    expect(deriveTrustRank(["system_trust_trusted"])).toBe("known");
    expect(deriveTrustRank(["system_trust_veteran"])).toBe("trusted");
  });

  test("returns the highest rank when several trust tags coexist", () => {
    // VRChat lists every trust tag up to the user's level; the top one wins.
    // This is the tag set from the sample account (a Trusted User).
    expect(
      deriveTrustRank([
        "language_jpn",
        "system_avatar_access",
        "system_world_access",
        "system_trust_basic",
        "system_feedback_access",
        "system_trust_known",
        "system_trust_trusted",
        "system_trust_veteran",
      ]),
    ).toBe("trusted");
  });

  test("labels follow VRChat's tag-name offset quirk", () => {
    // The tag name sits one step below the displayed rank name.
    expect(TRUST_RANK_LABELS[deriveTrustRank(["system_trust_trusted"])]).toBe("Known User");
    expect(TRUST_RANK_LABELS[deriveTrustRank(["system_trust_veteran"])]).toBe("Trusted User");
  });
});
