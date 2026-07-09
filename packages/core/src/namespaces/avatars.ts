// Avatars namespace: list the account owner's avatars.

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
}
