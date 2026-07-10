// Friends + notes merge (ported from the Worker UI's loadPeople). Online
// friends and noted users are combined into a single list: a friend who also
// has a note is enriched with it, and a note-only (offline) user gets a
// synthetic offline row so their note is still visible.

import type { RawUserNote } from "@vrc-toolkit/core";
import {
  type FriendSummary,
  fmtNote,
  mergeNotesWithTags,
  type UserNote,
} from "@vrc-toolkit/core/domain";

export interface Person {
  userId: string;
  displayName: string;
  imageUrl: string | null;
  isOnline: boolean;
  status: string;
  statusDescription: string;
  location: string;
  worldName: string | null;
  note: string;
  // VRChat trust/system tags, used to derive the trust rank for filtering.
  // Empty for note-only (offline) users the friend list did not return.
  tags: string[];
  // Always [] this stage: local tags require client-side persistence, which is
  // out of scope (see the omission note in FriendsView). Kept on the shape so
  // the domain merge/format helpers can be used as designed.
  localTags: string[];
}

// Narrow the namespace's optional-field RawUserNote into the domain's
// required-field UserNote so mergeNotesWithTags/fmtNote can consume it.
function toUserNote(n: RawUserNote): UserNote {
  return {
    id: n.id ?? "",
    userId: n.userId ?? "",
    targetUserId: n.targetUserId ?? "",
    note: n.note ?? "",
    createdAt: n.createdAt ?? "",
    targetUser: n.targetUser
      ? {
          id: n.targetUser.id ?? "",
          displayName: n.targetUser.displayName ?? "",
          currentAvatarThumbnailImageUrl: n.targetUser.currentAvatarThumbnailImageUrl ?? "",
        }
      : undefined,
  };
}

// Merge friends (online) with notes (any target, online or not) keyed by
// userId. Online status wins from the friends list; notes only ever add a
// note/localTags/fallback-thumbnail onto an existing entry or create an
// offline-only entry. Sorted online-first, then by display name.
export function buildPeople(friends: FriendSummary[], rawNotes: RawUserNote[]): Person[] {
  const notes = mergeNotesWithTags(rawNotes.map(toUserNote), []);
  const map = new Map<string, Person>();

  friends.forEach((f) => {
    map.set(f.id, {
      userId: f.id,
      displayName: f.displayName,
      imageUrl: f.imageUrl,
      isOnline: true,
      status: f.status,
      statusDescription: f.statusDescription,
      location: f.location,
      worldName: f.worldName,
      note: "",
      tags: f.tags,
      localTags: [],
    });
  });

  notes.forEach((n) => {
    const view = fmtNote(n);
    const existing = map.get(view.targetUserId);
    if (existing) {
      existing.note = view.note;
      existing.localTags = view.localTags;
      if (!existing.imageUrl && view.thumbnailImageUrl) {
        existing.imageUrl = view.thumbnailImageUrl;
      }
      return;
    }
    map.set(view.targetUserId, {
      userId: view.targetUserId,
      displayName: view.displayName,
      imageUrl: view.thumbnailImageUrl,
      isOnline: false,
      status: "",
      statusDescription: "",
      location: "",
      worldName: null,
      note: view.note,
      tags: [],
      localTags: view.localTags,
    });
  });

  const list = Array.from(map.values());
  list.sort((a, b) => {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    return a.displayName.localeCompare(b.displayName);
  });
  return list;
}
