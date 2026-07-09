// Notes namespace: the account owner's per-user notes.

import { VrcResource } from "../resource";
import { paginateAll } from "./_shared";

export interface NoteTargetUser {
  id?: string;
  displayName?: string;
  currentAvatarThumbnailImageUrl?: string;
}

// A VRChat UserNote as returned by GET /userNotes. Each row embeds a targetUser
// subset so a listing renders without an N+1 lookup.
export interface UserNote {
  id?: string;
  userId?: string;
  targetUserId?: string;
  note?: string;
  createdAt?: string;
  targetUser?: NoteTargetUser;
}

export interface UpsertNoteInput {
  targetUserId: string;
  note: string;
}

// VRChat caps `n` at 100; listAll pages with this size.
const PAGE_SIZE = 100;

export class NotesResource extends VrcResource {
  // GET /userNotes — one page of the owner's notes (raw).
  list(params: { n?: number; offset?: number } = {}): Promise<UserNote[]> {
    const n = params.n ?? PAGE_SIZE;
    const offset = params.offset ?? 0;
    return this.requestArray<UserNote>(`/userNotes?n=${n}&offset=${offset}`);
  }

  // Page GET /userNotes to exhaustion (n=100). Multiple requests by design.
  listAll(): Promise<UserNote[]> {
    return paginateAll(PAGE_SIZE, (offset) => this.list({ n: PAGE_SIZE, offset }));
  }

  // POST /userNotes { targetUserId, note }. An empty `note` clears the existing
  // note (VRChat treats "" as a delete); it is passed through verbatim rather
  // than special-cased here. Returns the raw upstream body (null when the clear
  // returns no JSON payload).
  upsert(input: UpsertNoteInput): Promise<unknown> {
    return this.request<unknown>("/userNotes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetUserId: input.targetUserId, note: input.note }),
    });
  }
}
