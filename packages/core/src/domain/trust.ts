// Trust rank derivation from a VRChat user's `tags`. VRChat encodes the account
// trust level as `system_trust_*` tags; the displayed rank is the highest one
// present. Note the well-known naming offset: the tag name sits one step below
// the rank it displays as (system_trust_trusted → "Known User",
// system_trust_veteran → "Trusted User").

export type TrustRank = "visitor" | "new" | "user" | "known" | "trusted";

// Trust ranks ordered lowest→highest. Filters threshold against this order.
export const TRUST_RANK_ORDER: readonly TrustRank[] = [
  "visitor",
  "new",
  "user",
  "known",
  "trusted",
];

// Displayed rank names, following VRChat's tag-name offset quirk.
export const TRUST_RANK_LABELS: Record<TrustRank, string> = {
  visitor: "Visitor",
  new: "New User",
  user: "User",
  known: "Known User",
  trusted: "Trusted User",
};

// The rank each trust tag confers. A user with no trust tag is a Visitor.
const TAG_TO_RANK: Record<string, TrustRank> = {
  system_trust_basic: "new",
  system_trust_known: "user",
  system_trust_trusted: "known",
  system_trust_veteran: "trusted",
};

// PURE: derive the displayed trust rank from a user's tags — the highest rank
// among the trust tags present, or "visitor" when none is present.
export function deriveTrustRank(tags: string[] | null | undefined): TrustRank {
  let best: TrustRank = "visitor";
  let bestIdx = 0;
  for (const tag of tags ?? []) {
    const rank = TAG_TO_RANK[tag];
    if (!rank) continue;
    const idx = TRUST_RANK_ORDER.indexOf(rank);
    if (idx > bestIdx) {
      best = rank;
      bestIdx = idx;
    }
  }
  return best;
}
