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

// Partial update body for PUT /users/{userId}. Only the fields present here
// are sent (JSON.stringify drops undefined-valued keys), so callers can patch
// bio/bioLinks/pronouns independently from status/statusDescription without
// clobbering the rest of the profile.
export interface UserProfilePatch {
  bio?: string;
  bioLinks?: string[];
  pronouns?: string;
  status?: string;
  statusDescription?: string;
}

export class UsersResource extends VrcResource {
  // GET /users/{userId}. Returns the raw profile verbatim.
  get(userId: string): Promise<VRChatUser | null> {
    return this.request<VRChatUser>(`/users/${encodeURIComponent(userId)}`);
  }

  // PUT /users/{userId} with `patch` sent verbatim. Domain validation (URL
  // shape, length limits, status enum) is the caller's concern, not this
  // transport-level method's.
  update(userId: string, patch: UserProfilePatch): Promise<unknown> {
    return this.request<unknown>(`/users/${encodeURIComponent(userId)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
  }
}
