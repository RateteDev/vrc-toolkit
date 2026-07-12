// Favorite/recent world list helpers: raw->summary narrowing for the worlds
// tab's card grid. Kept minimal (no description) since the grid only needs
// enough to render a card; WorldModal fetches the full detail on open.

import type { VRChatFavoriteGroup, VRChatWorld } from "../types";

export interface WorldSummary {
  id: string;
  name: string;
  thumbnailImageUrl: string | null;
  authorName: string;
  capacity: number | null;
  occupants: number | null;
  favoriteCount: number | null;
}

// Narrow a raw world object (favorites/recent list entry) to WorldSummary.
export function fmtWorld(raw: VRChatWorld): WorldSummary {
  return {
    id: raw.id || "",
    name: raw.name || "",
    thumbnailImageUrl: raw.thumbnailImageUrl || null,
    authorName: raw.authorName || "",
    capacity: typeof raw.capacity === "number" ? raw.capacity : null,
    occupants: typeof raw.occupants === "number" ? raw.occupants : null,
    favoriteCount: typeof raw.favorites === "number" ? raw.favorites : null,
  };
}

// A world favorite group narrowed for display: name is the fixed slot id
// (worlds1..worlds4), displayName is the user-renamable heading text.
export interface WorldFavoriteGroup {
  name: string;
  displayName: string;
  visibility: string;
}

// Filter GET /favorite/groups down to world groups and sort into worlds1..4
// order (name is a plain "worlds" + digit string, so lexical order already
// matches numeric order for this fixed 1-4 range).
export function worldFavoriteGroups(raw: VRChatFavoriteGroup[]): WorldFavoriteGroup[] {
  return raw
    .filter((g) => g.type === "world")
    .map((g) => ({
      name: g.name ?? "",
      displayName: g.displayName || g.name || "",
      visibility: g.visibility ?? "",
    }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}
