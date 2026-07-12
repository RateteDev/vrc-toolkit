// Worlds namespace: single world lookup (used to resolve a friend's worldId
// into a display name) plus the account owner's favorite/recent world lists.
// A non-200 on get() (e.g. 404 for an unknown/private world) throws VrcError;
// the caller falls back to a placeholder name.

import { VrcResource } from "../resource";
import type { VRChatWorld } from "../types";
import { buildQuery } from "./_shared";

export class WorldsResource extends VrcResource {
  // GET /worlds/{worldId}. Returns the raw world verbatim.
  get(worldId: string): Promise<VRChatWorld | null> {
    return this.request<VRChatWorld>(`/worlds/${encodeURIComponent(worldId)}`);
  }

  // GET /worlds/favorites?n={n}. One request; the caller picks a fixed n
  // (VRChat caps n at 100) instead of paging, per the unofficial-API policy.
  favorites(n: number): Promise<VRChatWorld[]> {
    return this.requestArray<VRChatWorld>(`/worlds/favorites${buildQuery({ n })}`);
  }

  // GET /worlds/recent?n={n}. Same single-request policy as favorites().
  recent(n: number): Promise<VRChatWorld[]> {
    return this.requestArray<VRChatWorld>(`/worlds/recent${buildQuery({ n })}`);
  }
}
