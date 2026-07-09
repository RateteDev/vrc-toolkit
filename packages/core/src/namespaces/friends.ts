// Friends namespace: the account owner's friend list.

import { VrcResource } from "../resource";
import type { VRChatFriend } from "../types";
import { buildQuery, PAGE_SIZE, paginateAll } from "./_shared";

export interface FriendsListParams {
  offline?: boolean;
  n?: number;
  offset?: number;
}

export class FriendsResource extends VrcResource {
  // GET /auth/user/friends. One request; the caller controls offline/n/offset.
  list(params: FriendsListParams = {}): Promise<VRChatFriend[]> {
    const query = buildQuery({ offline: params.offline, n: params.n, offset: params.offset });
    return this.requestArray<VRChatFriend>(`/auth/user/friends${query}`);
  }

  // Page GET /auth/user/friends to exhaustion (n=100), preserving the caller's
  // offline filter. Multiple requests — named to make that explicit.
  listAll(params: { offline?: boolean } = {}): Promise<VRChatFriend[]> {
    return paginateAll(PAGE_SIZE, (offset) => this.list({ ...params, n: PAGE_SIZE, offset }));
  }
}
