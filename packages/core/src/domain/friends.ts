// Friend location parsing / display helpers (spec No.1 + No.2) plus the
// friend-summary projection used by the dashboard.

import type { VRChatFriend } from "../types";
import { resolveThumbUrl } from "./files";

export interface ParsedLocation {
  kind: "offline" | "private" | "traveling" | "instance";
  worldId?: string;
  instanceId?: string;
}

export type InstanceType = "public" | "friends" | "hidden" | "private" | "group";

// Minimal shape consumed by pickThumb (a VRChat friend object subset).
export interface ThumbSource {
  profilePicOverrideThumbnail?: string | null;
  currentAvatarThumbnailImageUrl?: string | null;
}

// Parse a VRChat `location` string into a discriminated kind. The three
// sentinels ('offline'/'private'/'traveling') are guarded BEFORE any ':' split;
// an empty string is treated as 'offline'. Otherwise split on the FIRST ':'
// only (the instanceId itself may legitimately contain ':').
export function parseLocation(loc: string | null | undefined): ParsedLocation {
  if (!loc) return { kind: "offline" };
  if (loc === "offline") return { kind: "offline" };
  if (loc === "private") return { kind: "private" };
  if (loc === "traveling") return { kind: "traveling" };
  const sep = loc.indexOf(":");
  if (sep < 0) return { kind: "offline" };
  return {
    kind: "instance",
    worldId: loc.slice(0, sep),
    instanceId: loc.slice(sep + 1),
  };
}

// Classify an instanceId by its '~'-delimited tags. Returns 'public' when no
// access tag is present.
export function instanceType(instanceId: string | null | undefined): InstanceType {
  if (!instanceId) return "public";
  const tags = instanceId.split("~");
  for (const tag of tags) {
    const name = tag.split("(")[0];
    if (name === "hidden") return "hidden";
    if (name === "friends") return "friends";
    if (name === "private") return "private";
    if (name === "group") return "group";
  }
  return "public";
}

// Parse the deployment region from an instanceId's '~region(...)' tag. Returns
// the region code (e.g. 'eu'|'jp'|'us'|'use'|'usw'|'usx') or null when no
// region tag is present (no implicit default; the schema column is nullable).
export function parseRegion(instanceId: string | null | undefined): string | null {
  if (!instanceId) return null;
  const tags = instanceId.split("~");
  for (const tag of tags) {
    const open = tag.indexOf("(");
    if (open < 0) continue;
    const name = tag.slice(0, open);
    if (name === "region") {
      return tag.slice(open + 1).replace(")", "");
    }
  }
  return null;
}

// Decide whether the account owner can join the given parsed location now,
// using the access tags embedded in parsed.instanceId.
export function isJoinable(parsed: ParsedLocation): boolean {
  if (parsed.kind !== "instance") return false;
  if (!parsed.instanceId) return false;
  const t = instanceType(parsed.instanceId);
  if (t === "public" || t === "friends" || t === "hidden") return true;
  if (t === "private") return false;
  if (t === "group") {
    const tags = parsed.instanceId.split("~");
    for (const tag of tags) {
      const open = tag.indexOf("(");
      if (open < 0) continue;
      const name = tag.slice(0, open);
      if (name === "groupAccessType") {
        const value = tag.slice(open + 1).replace(")", "");
        return value === "public";
      }
    }
    return false;
  }
  return false;
}

// Pick the display thumbnail URL for a friend: profilePicOverrideThumbnail wins
// when it is a non-empty string, otherwise fall back to the avatar thumbnail.
export function pickThumb(friend: ThumbSource): string | null {
  if (friend.profilePicOverrideThumbnail) {
    return friend.profilePicOverrideThumbnail;
  }
  if (friend.currentAvatarThumbnailImageUrl) {
    return friend.currentAvatarThumbnailImageUrl;
  }
  return null;
}

// UI-facing shape for a single online friend on the dashboard.
export interface FriendSummary {
  id: string;
  displayName: string;
  status: string;
  statusDescription: string;
  isOnline: boolean;
  location: string;
  worldId: string | null;
  worldName: string | null;
  instanceId: string | null;
  imageUrl: string | null;
}

// Narrow a raw friend object to the fields the UI needs. Pure; worldName is left
// null here and filled in by the caller after resolving world ids.
export function toFriendSummary(f: VRChatFriend): FriendSummary {
  const location = f?.location ?? "";
  const parsed = parseLocation(location);
  const thumb = pickThumb({
    profilePicOverrideThumbnail: f?.profilePicOverrideThumbnail,
    currentAvatarThumbnailImageUrl: f?.currentAvatarThumbnailImageUrl,
  });
  return {
    id: f?.id ?? "",
    displayName: f?.displayName ?? "",
    status: f?.status ?? "",
    statusDescription: f?.statusDescription ?? "",
    // The endpoint is queried with offline=false, so any returned friend has a
    // non-offline location; treat a non-offline parsed location as online.
    isOnline: parsed.kind !== "offline",
    location,
    worldId: parsed.worldId ?? null,
    worldName: null,
    instanceId: parsed.instanceId ?? null,
    imageUrl: resolveThumbUrl(thumb),
  };
}
