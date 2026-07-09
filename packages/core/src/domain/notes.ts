// Notes hub + business card projections (spec No.30 / No.31).

import { fmtDate } from "./dates";

// Embedded target-user subset returned by GET /userNotes (avoids N+1 lookups).
export interface NoteTargetUser {
  id: string;
  displayName: string;
  currentAvatarThumbnailImageUrl: string;
}

// A VRChat UserNote as returned by GET /userNotes (note body is API-managed).
export interface UserNote {
  id: string;
  userId: string;
  targetUserId: string;
  note: string;
  createdAt: string;
  targetUser?: NoteTargetUser;
}

// A local note_tag row (tags are owner-assigned, not VRChat-managed).
export interface NoteTagRow {
  target_user_id: string;
  tag: string;
  created_at: string;
}

// A UserNote with its matched local tags attached.
export interface NoteWithTags extends UserNote {
  localTags: string[];
}

// UI-facing shape for a single note row.
export interface NoteView {
  targetUserId: string;
  displayName: string;
  thumbnailImageUrl: string | null;
  note: string;
  localTags: string[];
}

// Attach local note_tag rows onto each UserNote by target user id. Orphan tag
// rows (no matching note) are dropped — never synthesize a note row for them.
export function mergeNotesWithTags(notes: UserNote[], tagRows: NoteTagRow[]): NoteWithTags[] {
  const byTarget: { [targetUserId: string]: string[] } = {};
  tagRows.forEach((row) => {
    let list = byTarget[row.target_user_id];
    if (!list) {
      list = [];
      byTarget[row.target_user_id] = list;
    }
    list.push(row.tag);
  });
  return notes.map((note) => ({
    ...note,
    localTags: byTarget[note.targetUserId] ?? [],
  }));
}

// Format a UserNote for display; falls back to the bare targetUserId when the
// embedded targetUser (or its displayName) is missing. Accepts either a bare
// UserNote or one already merged with local tags (mergeNotesWithTags' output).
export function fmtNote(note: UserNote | NoteWithTags): NoteView {
  const target = note.targetUser;
  const displayName = target?.displayName ? target.displayName : note.targetUserId;
  const thumbnailImageUrl = target?.currentAvatarThumbnailImageUrl
    ? target.currentAvatarThumbnailImageUrl
    : null;
  return {
    targetUserId: note.targetUserId,
    displayName,
    thumbnailImageUrl,
    note: note.note,
    localTags: "localTags" in note ? note.localTags : [],
  };
}

// Raw profile object as returned by GET /users/{userId} (snake_case timestamps,
// note body embedded).
export interface RawCardUser {
  id?: string;
  displayName?: string;
  bio?: string;
  bioLinks?: string[];
  statusDescription?: string;
  status?: string;
  pronouns?: string;
  date_joined?: string;
  last_login?: string;
  last_activity?: string;
  tags?: string[];
  profilePicOverride?: string;
  currentAvatarThumbnailImageUrl?: string;
  note?: string;
}

// UI-facing business-card shape (No.31).
export interface Card {
  displayName: string;
  bio: string;
  bioLinks: string[];
  statusDescription: string;
  status: string;
  pronouns: string;
  dateJoined: string;
  lastLogin: string;
  tags: string[];
  imageUrl: string | null;
  note: string;
  localTags: string[];
}

// Build a Card from a /users/{id} profile and the owner's local tags.
// Defensive: empty last_login/last_activity must not throw; bioLinks defaults
// to []; imageUrl falls back to currentAvatarThumbnailImageUrl when
// profilePicOverride is empty; tags keep only system_*/language_* entries.
export function fmtCard(user: RawCardUser, localTags: string[]): Card {
  const rawTags = user.tags ? user.tags : [];
  const systemTags = rawTags.filter(
    (t) => t.indexOf("system_") === 0 || t.indexOf("language_") === 0,
  );
  return {
    displayName: user.displayName ? user.displayName : "",
    bio: user.bio ? user.bio : "",
    bioLinks: user.bioLinks ? user.bioLinks : [],
    statusDescription: user.statusDescription ? user.statusDescription : "",
    status: user.status ? user.status : "",
    pronouns: user.pronouns ? user.pronouns : "",
    dateJoined: fmtDate(user.date_joined),
    lastLogin: fmtDate(user.last_login),
    tags: systemTags,
    imageUrl: user.profilePicOverride
      ? user.profilePicOverride
      : user.currentAvatarThumbnailImageUrl
        ? user.currentAvatarThumbnailImageUrl
        : null,
    note: user.note ? user.note : "",
    localTags,
  };
}
