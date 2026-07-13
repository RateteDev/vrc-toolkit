// Groups domain helpers: raw->display narrowing for the group card grid, the
// group detail modal's posts, and the open-instance rows. Pure (Date/string
// only); the view stays free of parsing and sorting logic.

import type { VRChatGroupInstance, VRChatGroupPost, VRChatUserGroup } from "../types";

// Parse an ISO-ish instant into a Date, or null when falsy/unparseable. Kept
// local so callers get Date|null fields rather than re-parsing strings.
function toDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

// A group membership narrowed for the card grid. `tag` is the display form of
// shortCode#discriminator, empty when either part is missing.
export interface GroupSummary {
  id: string;
  name: string;
  iconUrl: string | null;
  memberCount: number | null;
  isRepresenting: boolean;
  shortCode: string;
  discriminator: string;
  tag: string;
  lastPostCreatedAt: Date | null;
  lastPostReadAt: Date | null;
}

// Narrow a raw user-group entry to GroupSummary. `groupId` (the grp_... id) is
// preferred as the identity; `id` is a fallback for shape variance.
export function fmtUserGroup(raw: VRChatUserGroup): GroupSummary {
  const shortCode = raw.shortCode ?? "";
  const discriminator = raw.discriminator ?? "";
  return {
    id: raw.groupId || raw.id || "",
    name: raw.name || "",
    iconUrl: raw.iconUrl || null,
    memberCount: typeof raw.memberCount === "number" ? raw.memberCount : null,
    isRepresenting: raw.isRepresenting === true,
    shortCode,
    discriminator,
    tag: shortCode && discriminator ? `${shortCode}#${discriminator}` : "",
    lastPostCreatedAt: toDate(raw.lastPostCreatedAt),
    lastPostReadAt: toDate(raw.lastPostReadAt),
  };
}

// True when the group has at least one post and it is newer than the last read
// marker (or was never read). A group with no posts is never "unread".
export function hasUnreadPost(group: GroupSummary): boolean {
  if (!group.lastPostCreatedAt) return false;
  if (!group.lastPostReadAt) return true;
  return group.lastPostReadAt.getTime() < group.lastPostCreatedAt.getTime();
}

// Order groups for the card grid: unread first, then by most recent post
// (descending), with post-less groups pushed to the end and ordered by name.
// Returns a new array; the input is not mutated.
export function sortGroups(groups: GroupSummary[]): GroupSummary[] {
  return [...groups].sort((a, b) => {
    const au = hasUnreadPost(a);
    const bu = hasUnreadPost(b);
    if (au !== bu) return au ? -1 : 1;
    const ap = a.lastPostCreatedAt;
    const bp = b.lastPostCreatedAt;
    if (ap && bp) return bp.getTime() - ap.getTime();
    if (ap) return -1;
    if (bp) return 1;
    return a.name.localeCompare(b.name);
  });
}

// A group post narrowed for display. `text` keeps its raw newlines for
// pre-wrapped rendering.
export interface GroupPostView {
  id: string;
  title: string;
  text: string;
  imageUrl: string | null;
  createdAt: Date | null;
}

export function fmtGroupPost(raw: VRChatGroupPost): GroupPostView {
  return {
    id: raw.id || "",
    title: raw.title || "",
    text: raw.text || "",
    imageUrl: raw.imageUrl || null,
    createdAt: toDate(raw.createdAt),
  };
}

// Extract the owning group id from an instance location's `~group(grp_...)`
// tag. Returns null when no group tag is present (non-group location or a
// malformed string), since only group instances belong to a group.
export function groupIdFromLocation(location: string | null | undefined): string | null {
  if (!location) return null;
  for (const tag of location.split("~")) {
    const open = tag.indexOf("(");
    if (open < 0) continue;
    if (tag.slice(0, open) === "group") return tag.slice(open + 1).replace(")", "");
  }
  return null;
}

// An open group instance narrowed for a detail-modal row. `groupId` is derived
// from the location so the view can associate the instance with its group.
export interface GroupInstanceView {
  location: string;
  worldName: string;
  worldThumbnailUrl: string | null;
  userCount: number | null;
  capacity: number | null;
  groupId: string | null;
}

export function fmtGroupInstance(raw: VRChatGroupInstance): GroupInstanceView {
  return {
    location: raw.location || "",
    worldName: raw.world?.name || raw.name || "",
    worldThumbnailUrl: raw.world?.thumbnailImageUrl || raw.world?.imageUrl || null,
    userCount: typeof raw.userCount === "number" ? raw.userCount : null,
    capacity: typeof raw.capacity === "number" ? raw.capacity : null,
    groupId: groupIdFromLocation(raw.location),
  };
}

// Filter open instances down to those owned by `groupId`. Used both to list a
// group's instances in its modal and to flag "開催中" on its card.
export function instancesForGroup(
  groupId: string,
  instances: GroupInstanceView[],
): GroupInstanceView[] {
  return instances.filter((inst) => inst.groupId === groupId);
}
