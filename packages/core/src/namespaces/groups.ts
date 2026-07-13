// Groups namespace: the account owner's group memberships, a group's post feed
// (paged on demand), and the owner's currently-open group instances. All reads;
// data is fetched on mount / manual refresh only (no polling), and posts load
// only when a group is opened, per the unofficial-API load policy.

import { VrcResource } from "../resource";
import type { VRChatGroupInstancesResponse, VRChatGroupPostsPage, VRChatUserGroup } from "../types";
import { buildQuery } from "./_shared";

export class GroupsResource extends VrcResource {
  // GET /users/{userId}/groups. Returns the raw membership list verbatim.
  userGroups(userId: string): Promise<VRChatUserGroup[]> {
    return this.requestArray<VRChatUserGroup>(`/users/${encodeURIComponent(userId)}/groups`);
  }

  // GET /groups/{groupId}/posts?n={n}&offset={offset}. Returns the raw
  // {posts,total} envelope (or null on an empty body); the caller pages by
  // offset while it still has unseen posts, so no internal paging here.
  posts(
    groupId: string,
    opts: { n: number; offset: number },
  ): Promise<VRChatGroupPostsPage | null> {
    const query = buildQuery({ n: opts.n, offset: opts.offset });
    return this.request<VRChatGroupPostsPage>(
      `/groups/${encodeURIComponent(groupId)}/posts${query}`,
    );
  }

  // GET /users/{userId}/instances/groups. Returns the raw {fetchedAt,instances}
  // envelope; the owning group of each instance is derived from its location.
  userGroupInstances(userId: string): Promise<VRChatGroupInstancesResponse | null> {
    return this.request<VRChatGroupInstancesResponse>(
      `/users/${encodeURIComponent(userId)}/instances/groups`,
    );
  }
}
