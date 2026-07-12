// Favorite/recent world list helpers: raw->summary narrowing for the worlds
// tab's card grid. Kept minimal (no description) since the grid only needs
// enough to render a card; WorldModal fetches the full detail on open.

import type { VRChatWorld } from "../types";

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
