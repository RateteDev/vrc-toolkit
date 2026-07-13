// Owned-avatar list helpers (spec No.22): raw->summary narrowing. Pagination
// itself lives in namespaces/_shared.ts (the transport-facing layer).

import type { VRChatFavoriteGroup } from "../types";

// A single Unity build target reported on an avatar, deduped by platform.
export interface AvatarPlatform {
  platform: string;
  performanceRating: string | null;
}

// UI-facing shape for an owned avatar (snake_case timestamps absorbed).
export interface AvatarSummary {
  id: string;
  name: string;
  releaseStatus: string;
  thumbnailImageUrl: string | null;
  updatedAt: string;
  description: string;
  version: number | null;
  createdAt: string;
  platforms: AvatarPlatform[];
}

// Raw avatar object subset (list response has snake_case created_at/updated_at
// and no top-level assetUrl).
export interface RawAvatar {
  id?: string;
  name?: string;
  releaseStatus?: string;
  thumbnailImageUrl?: string | null;
  created_at?: string;
  updated_at?: string;
  description?: string;
  version?: number;
  unityPackages?: Array<{ platform?: string; performanceRating?: string | null }>;
}

// Dedupe unityPackages by platform (first appearance wins), skipping entries
// without a platform string — the API represents "unknown platform" that way.
function fmtPlatforms(unityPackages: RawAvatar["unityPackages"]): AvatarPlatform[] {
  if (!unityPackages) return [];
  const seen = new Set<string>();
  const platforms: AvatarPlatform[] = [];
  for (const pkg of unityPackages) {
    if (!pkg.platform || seen.has(pkg.platform)) continue;
    seen.add(pkg.platform);
    platforms.push({ platform: pkg.platform, performanceRating: pkg.performanceRating ?? null });
  }
  return platforms;
}

// Narrow a raw avatar object to AvatarSummary, absorbing snake_case
// created_at/updated_at into camelCase createdAt/updatedAt.
export function fmtAvatar(raw: RawAvatar): AvatarSummary {
  return {
    id: raw.id || "",
    name: raw.name || "",
    releaseStatus: raw.releaseStatus || "",
    thumbnailImageUrl: raw.thumbnailImageUrl || null,
    updatedAt: raw.updated_at || "",
    description: raw.description || "",
    version: raw.version ?? null,
    createdAt: raw.created_at || "",
    platforms: fmtPlatforms(raw.unityPackages),
  };
}

// GET /avatars/favorites entry: RawAvatar plus the favorite filing (group,
// favorite record id) and author identity that owned-avatar cards don't need.
export interface RawFavoriteAvatar extends RawAvatar {
  authorName?: string;
  favoriteGroup?: string;
  favoriteId?: string;
}

// UI-facing shape for a favorite avatar: AvatarSummary plus the fields needed
// to bucket it into its favorite-group section and display its author.
export interface FavoriteAvatarSummary extends AvatarSummary {
  authorName: string;
  favoriteGroup: string;
  favoriteId: string;
}

// Narrow a raw favorite avatar object to FavoriteAvatarSummary.
export function fmtFavoriteAvatar(raw: RawFavoriteAvatar): FavoriteAvatarSummary {
  return {
    ...fmtAvatar(raw),
    authorName: raw.authorName || "",
    favoriteGroup: raw.favoriteGroup || "",
    favoriteId: raw.favoriteId || "",
  };
}

// An avatar favorite group narrowed for display: name is the fixed slot id,
// displayName is the user-renamable heading text. Mirrors worldFavoriteGroups.
export interface AvatarFavoriteGroup {
  name: string;
  displayName: string;
  visibility: string;
}

// Filter GET /favorite/groups down to avatar groups, sorted by name for a
// deterministic section order (mirrors worldFavoriteGroups).
export function avatarFavoriteGroups(raw: VRChatFavoriteGroup[]): AvatarFavoriteGroup[] {
  return raw
    .filter((g) => g.type === "avatar")
    .map((g) => ({
      name: g.name ?? "",
      displayName: g.displayName || g.name || "",
      visibility: g.visibility ?? "",
    }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}
