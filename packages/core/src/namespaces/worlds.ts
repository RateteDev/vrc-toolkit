// Worlds namespace: single world lookup (used to resolve a friend's worldId
// into a display name) plus the account owner's favorite/recent world lists
// and favorite groups. A non-200 on get() (e.g. 404 for an unknown/private
// world) throws VrcError; the caller falls back to a placeholder name.

import { VrcResource } from "../resource";
import type { VRChatFavoriteGroup, VRChatWorld } from "../types";
import { buildQuery, PAGE_SIZE, paginateAllGuarded } from "./_shared";

export class WorldsResource extends VrcResource {
  // GET /worlds/{worldId}. Returns the raw world verbatim.
  get(worldId: string): Promise<VRChatWorld | null> {
    return this.request<VRChatWorld>(`/worlds/${encodeURIComponent(worldId)}`);
  }

  // GET /worlds/favorites?n=100&offset={k}, paged to exhaustion. Real-API
  // verified: offset paging works (280 favorites -> 100/100/80 pages), but
  // the guarded paginator is used anyway as defense against a future silent
  // regression to an ignored offset (mirrors prints.listAll/inventory.listAll).
  // favoriteId (unique per favorite entry) is preferred as the dedup key over
  // id (worldId), which is not guaranteed unique across groups.
  favorites(): Promise<VRChatWorld[]> {
    return paginateAllGuarded(
      PAGE_SIZE,
      (offset) =>
        this.requestArray<VRChatWorld>(`/worlds/favorites${buildQuery({ n: PAGE_SIZE, offset })}`),
      (w) => w.favoriteId ?? w.id,
    );
  }

  // GET /favorite/groups. Raw passthrough across ALL favorite types
  // (avatar/world/friend); callers filter by `type`. Small, unpaged list —
  // one request, per the unofficial-API policy.
  favoriteGroups(): Promise<VRChatFavoriteGroup[]> {
    return this.requestArray<VRChatFavoriteGroup>("/favorite/groups");
  }

  // GET /worlds/recent?n={n}. Single-request policy (VRChat caps n at 100).
  recent(n: number): Promise<VRChatWorld[]> {
    return this.requestArray<VRChatWorld>(`/worlds/recent${buildQuery({ n })}`);
  }
}
