// Owned-avatar list helpers (spec No.22): raw->summary narrowing. Pagination
// itself lives in namespaces/_shared.ts (the transport-facing layer).

// UI-facing shape for an owned avatar (snake_case timestamps absorbed).
export interface AvatarSummary {
  id: string;
  name: string;
  releaseStatus: string;
  thumbnailImageUrl: string | null;
  updatedAt: string;
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
}

// Narrow a raw avatar object to AvatarSummary, absorbing snake_case
// created_at/updated_at into a single camelCase updatedAt.
export function fmtAvatar(raw: RawAvatar): AvatarSummary {
  return {
    id: raw.id || "",
    name: raw.name || "",
    releaseStatus: raw.releaseStatus || "",
    thumbnailImageUrl: raw.thumbnailImageUrl || null,
    updatedAt: raw.updated_at || "",
  };
}
