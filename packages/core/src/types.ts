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
