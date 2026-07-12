// Pure grouping of the account owner's favorite worlds into per-favorite-group
// sections. Driven by the known favorite groups (already type=world-filtered
// and worlds1..4-ordered by the core domain); a favoriteGroup value with no
// matching known group still gets its own section (fallback bucket labeled by
// the raw value) so a favorite is never silently dropped.

import type { VRChatWorld } from "@vrc-toolkit/core";
import { fmtWorld, type WorldFavoriteGroup, type WorldSummary } from "@vrc-toolkit/core/domain";

export interface FavoriteSection {
  key: string;
  displayName: string;
  worlds: WorldSummary[];
}

export function groupFavorites(
  raw: VRChatWorld[],
  groups: WorldFavoriteGroup[],
): FavoriteSection[] {
  const byGroup = new Map<string, WorldSummary[]>();
  for (const w of raw) {
    const key = w.favoriteGroup ?? "";
    const list = byGroup.get(key);
    if (list) list.push(fmtWorld(w));
    else byGroup.set(key, [fmtWorld(w)]);
  }

  const known = new Set(groups.map((g) => g.name));
  const sections: FavoriteSection[] = groups.map((g) => ({
    key: g.name,
    displayName: g.displayName,
    worlds: byGroup.get(g.name) ?? [],
  }));

  // Deterministic ordering for the fallback bucket(s), since encounter order
  // depends on the API's response order rather than anything meaningful.
  const fallbackKeys = Array.from(byGroup.keys())
    .filter((key) => !known.has(key))
    .sort();
  for (const key of fallbackKeys) {
    sections.push({
      key,
      displayName: key || "（未分類）",
      worlds: byGroup.get(key) ?? [],
    });
  }

  return sections;
}
