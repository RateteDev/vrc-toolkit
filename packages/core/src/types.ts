// Wire shapes for the unofficial VRChat API, shared by the endpoint namespaces
// and the domain helpers. Only fields we consume are typed; all optional because
// the API is undocumented and may omit fields. These are the API's *raw* shapes:
// namespaces return them verbatim (no translation layer); domain helpers narrow
// them into display shapes.

export interface AuthUserResponse {
  id?: string;
  displayName?: string;
  requiresTwoFactorAuth?: string[];
  status?: string;
  statusDescription?: string;
  location?: string;
  currentAvatarImageUrl?: string | null;
  currentAvatarThumbnailImageUrl?: string | null;
  currentAvatar?: string;
  bio?: string;
  bioLinks?: string[];
  pronouns?: string;
}

export interface TwoFactorVerifyResponse {
  verified?: boolean;
}

export interface VRChatPrint {
  id?: string;
  note?: string | null;
  createdAt?: string;
  timestamp?: string;
  worldName?: string | null;
  world?: { name?: string | null } | null;
  files?: { image?: string };
  image?: string;
}

export interface VRChatFriend {
  id?: string;
  displayName?: string;
  status?: string;
  statusDescription?: string;
  location?: string;
  tags?: string[];
  profilePicOverrideThumbnail?: string | null;
  currentAvatarThumbnailImageUrl?: string | null;
}

export interface VRChatWorld {
  id?: string;
  name?: string;
  description?: string;
  authorName?: string;
  capacity?: number;
  imageUrl?: string | null;
  thumbnailImageUrl?: string | null;
  occupants?: number;
  favorites?: number;
  // Only present on GET /worlds/favorites entries.
  favoriteGroup?: string;
  favoriteId?: string;
}

// GET /avatars/favorites entry: a full avatar object (unlike the minimal
// RawListAvatar returned by GET /avatars), carrying favoriteGroup/favoriteId
// like a world favorite entry, plus author identity for display.
export interface VRChatAvatar {
  id?: string;
  name?: string;
  description?: string;
  authorId?: string;
  authorName?: string;
  releaseStatus?: string;
  thumbnailImageUrl?: string | null;
  created_at?: string;
  updated_at?: string;
  version?: number;
  unityPackages?: Array<{ platform?: string; performanceRating?: string | null }>;
  // Only present on GET /avatars/favorites entries.
  favoriteGroup?: string;
  favoriteId?: string;
}

// GET /favorite/groups returns one entry per favorite group across ALL
// favorite types (avatar/world/friend), not just worlds; callers filter by
// `type`. `name` is the fixed slot id (worlds1..worlds4 for world groups);
// `displayName` is user-renamable and is what the UI should show.
export interface VRChatFavoriteGroup {
  name?: string;
  displayName?: string;
  type?: string;
  visibility?: string;
}

// Wire shape of GET /instances/{location}. Only the fields the JOIN先 instance
// row consumes are typed; all optional since the endpoint is undocumented.
export interface VRChatInstance {
  id?: string;
  location?: string;
  worldId?: string;
  // Access type token (e.g. "public"/"hidden"/"friends"/"private"/"group"),
  // redundant with parseInstanceAccess(location) but kept for completeness.
  type?: string;
  region?: string;
  n_users?: number;
  capacity?: number;
  // False when the instance is at capacity for the account owner specifically
  // (may differ from `full` due to queueing/group rules).
  hasCapacityForYou?: boolean;
  ageGate?: boolean;
  full?: boolean;
  canRequestInvite?: boolean;
  groupAccessType?: string;
  queueEnabled?: boolean;
}

// Minimal shape of a VRChat File object (POST /file/image response, GET
// /file/{fileId}), only the fields needed to resolve the latest version's URL.
export interface VRChatFile {
  id?: string;
  versions?: Array<{ file?: { url?: string } }>;
}

export interface PrintUploadResponse {
  id?: string;
  ownerId?: string;
  note?: string | null;
  timestamp?: string;
}
