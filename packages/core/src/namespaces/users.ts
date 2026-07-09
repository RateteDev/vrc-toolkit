// Users namespace: single user profile lookup.

import { VrcResource } from "../resource";

// Raw user profile from GET /users/{userId}. `note` embeds the owner's private
// note for this user, so one call yields both profile and note. Only fields we
// surface are typed; the API returns more.
export interface VRChatUser {
  id?: string;
  displayName?: string;
  bio?: string;
  bioLinks?: string[];
  statusDescription?: string;
  status?: string;
  pronouns?: string;
  date_joined?: string;
  last_login?: string;
  last_activity?: string;
  tags?: string[];
  profilePicOverride?: string;
  currentAvatarThumbnailImageUrl?: string;
  note?: string;
}

export class UsersResource extends VrcResource {
  // GET /users/{userId}. Returns the raw profile verbatim.
  get(userId: string): Promise<VRChatUser | null> {
    return this.request<VRChatUser>(`/users/${encodeURIComponent(userId)}`);
  }
}
