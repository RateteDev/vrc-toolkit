// Worlds namespace: single world lookup, used to resolve a friend's worldId
// into a display name. A non-200 (e.g. 404 for an unknown/private world) throws
// VrcError; the caller falls back to a placeholder name.

import { VrcResource } from "../resource";
import type { VRChatWorld } from "../types";

export class WorldsResource extends VrcResource {
  // GET /worlds/{worldId}. Returns the raw world verbatim.
  get(worldId: string): Promise<VRChatWorld | null> {
    return this.request<VRChatWorld>(`/worlds/${encodeURIComponent(worldId)}`);
  }
}
