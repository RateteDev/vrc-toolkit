// Invite namespace: self-invite to a joinable instance. Write operation, so it
// is kept to a single explicit call site per plan's non-official-API policy
// (user-initiated, low frequency).

import { parseLocation } from "../domain/friends";
import { VrcResource } from "../resource";

export class InviteResource extends VrcResource {
  // POST /invite/myself/to/{location}. `location` is a raw `wrld_xxx:instanceId`
  // string and is sent verbatim (NOT encodeURIComponent'd): the colon and '~'
  // tag separators are part of the path VRChat expects, and encoding them would
  // break the route. Rejects up front (no request sent) when `location` does not
  // parse to an 'instance' kind, since only an instance location is invitable.
  async myselfTo(location: string): Promise<unknown> {
    const parsed = parseLocation(location);
    if (parsed.kind !== "instance") {
      throw new Error(`InviteResource.myselfTo: location is not a joinable instance: ${location}`);
    }
    return this.request<unknown>(`/invite/myself/to/${location}`, { method: "POST" });
  }
}
