import type { TrustRank } from "@vrc-toolkit/core/domain";

// CSS class carrying the official-style trust color for a rank. The color hexes
// live in styles.css keyed by these classes (mirrors how presence dots keep
// their colors in CSS rather than inline).
export function trustClass(rank: TrustRank): string {
  return `trust-${rank}`;
}
