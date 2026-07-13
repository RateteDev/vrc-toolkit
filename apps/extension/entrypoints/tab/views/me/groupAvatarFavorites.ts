// Pure grouping of the account owner's favorite avatars into per-favorite-group
// sections. Mirrors views/worlds/groupFavorites.ts: driven by the known
// favorite groups (already type=avatar-filtered by the core domain); a
// favoriteGroup value with no matching known group still gets its own section
// (fallback bucket labeled by the raw value) so a favorite is never silently
// dropped.

import type { VRChatAvatar } from "@vrc-toolkit/core";
import {
  type AvatarFavoriteGroup,
  type FavoriteAvatarSummary,
  fmtFavoriteAvatar,
} from "@vrc-toolkit/core/domain";

export interface AvatarFavoriteSection {
  key: string;
  displayName: string;
  avatars: FavoriteAvatarSummary[];
}

export function groupAvatarFavorites(
  raw: VRChatAvatar[],
  groups: AvatarFavoriteGroup[],
): AvatarFavoriteSection[] {
  const byGroup = new Map<string, FavoriteAvatarSummary[]>();
  for (const a of raw) {
    const key = a.favoriteGroup ?? "";
    const list = byGroup.get(key);
    if (list) list.push(fmtFavoriteAvatar(a));
    else byGroup.set(key, [fmtFavoriteAvatar(a)]);
  }

  const known = new Set(groups.map((g) => g.name));
  const sections: AvatarFavoriteSection[] = groups.map((g) => ({
    key: g.name,
    displayName: g.displayName,
    avatars: byGroup.get(g.name) ?? [],
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
      avatars: byGroup.get(key) ?? [],
    });
  }

  return sections;
}
