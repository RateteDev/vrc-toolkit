// Owned-avatar list helpers (spec No.22): raw->summary narrowing. Pagination
// itself lives in namespaces/_shared.ts (the transport-facing layer).

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
