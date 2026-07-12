// Instances namespace: read-only instance detail lookup (occupancy, capacity,
// age gate, group access) used to render the JOIN先 instance rows. Kept
// separate from InviteResource (the write-side self-invite call) since the two
// have different verbs and failure semantics.

import { parseLocation } from "../domain/friends";
import { VrcResource } from "../resource";
import type { VRChatInstance } from "../types";

export class InstancesResource extends VrcResource {
  // GET /instances/{location}. `location` is sent verbatim (NOT
  // encodeURIComponent'd), matching InviteResource.myselfTo: the colon and '~'
  // tag separators are part of the path VRChat expects. Rejects up front (no
  // request sent) when `location` does not parse to an 'instance' kind, since
  // only an instance location has detail to fetch.
  async get(location: string): Promise<VRChatInstance | null> {
    const parsed = parseLocation(location);
    if (parsed.kind !== "instance") {
      throw new Error(`InstancesResource.get: location is not an instance: ${location}`);
    }
    return this.request<VRChatInstance>(`/instances/${location}`);
  }
}
