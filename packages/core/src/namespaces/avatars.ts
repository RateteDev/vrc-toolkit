// Avatars namespace: list, update, and delete the account owner's avatars.

import { VrcResource } from "../resource";
import { buildQuery, PAGE_SIZE, paginateAll } from "./_shared";

// Raw avatar object from GET /avatars in list form (snake_case timestamps, no
// top-level assetUrl). Only fields we surface are typed.
export interface RawListAvatar {
  id?: string;
  name?: string;
  releaseStatus?: string;
  thumbnailImageUrl?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AvatarsListParams {
  user?: string;
  releaseStatus?: string;
  n?: number;
  offset?: number;
}

// Fields PUT /avatars/{avatarId} accepts. All optional: only the fields the
// caller sets are sent, so unrelated avatar fields are left untouched upstream.
export interface AvatarUpdateInput {
  name?: string;
  description?: string;
  imageUrl?: string;
  releaseStatus?: string;
  tags?: string[];
  version?: number;
}

export class AvatarsResource extends VrcResource {
  // GET /avatars — one page (raw). Caller controls user/releaseStatus/n/offset.
  list(params: AvatarsListParams = {}): Promise<RawListAvatar[]> {
    const query = buildQuery({
      user: params.user,
      releaseStatus: params.releaseStatus,
      n: params.n,
      offset: params.offset,
    });
    return this.requestArray<RawListAvatar>(`/avatars${query}`);
  }

  // Page GET /avatars to exhaustion (n=100), preserving the caller's
  // user/releaseStatus filter (e.g. user=me, releaseStatus=all). Multiple
  // requests — named to make that explicit.
  listAll(params: { user?: string; releaseStatus?: string } = {}): Promise<RawListAvatar[]> {
    return paginateAll(PAGE_SIZE, (offset) => this.list({ ...params, n: PAGE_SIZE, offset }));
  }

  // DELETE /avatars/{avatarId}.
  async delete(avatarId: string): Promise<void> {
    await this.request(`/avatars/${encodeURIComponent(avatarId)}`, { method: "DELETE" });
  }

  // PUT /avatars/{avatarId} with only the caller-provided fields (undefined
  // fields are omitted, not sent as null — VRChat treats a present-but-null
  // field differently from an absent one on some endpoints).
  update(avatarId: string, patch: AvatarUpdateInput): Promise<RawListAvatar | null> {
    const body: AvatarUpdateInput = {};
    if (patch.name !== undefined) body.name = patch.name;
    if (patch.description !== undefined) body.description = patch.description;
    if (patch.imageUrl !== undefined) body.imageUrl = patch.imageUrl;
    if (patch.releaseStatus !== undefined) body.releaseStatus = patch.releaseStatus;
    if (patch.tags !== undefined) body.tags = patch.tags;
    if (patch.version !== undefined) body.version = patch.version;
    return this.request<RawListAvatar>(`/avatars/${encodeURIComponent(avatarId)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }
}
