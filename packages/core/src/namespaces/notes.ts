// Notes namespace: the account owner's per-user notes.

import { VrcResource } from "../resource";
import { buildQuery, PAGE_SIZE, paginateAll } from "./_shared";

// Raw* prefix avoids colliding with the differently-shaped UserNote/
// NoteTargetUser in domain/notes.ts.
export interface RawNoteTargetUser {
  id?: string;
  displayName?: string;
  currentAvatarThumbnailImageUrl?: string;
}

// A VRChat UserNote as returned by GET /userNotes. Each row embeds a targetUser
// subset so a listing renders without an N+1 lookup.
export interface RawUserNote {
  id?: string;
  userId?: string;
  targetUserId?: string;
  note?: string;
  createdAt?: string;
  targetUser?: RawNoteTargetUser;
}

export interface UpsertNoteInput {
  targetUserId: string;
  note: string;
}

export interface NotesListParams {
  n?: number;
  offset?: number;
}

export class NotesResource extends VrcResource {
  // GET /userNotes — one page of the owner's notes (raw). Caller controls
  // n/offset; when unspecified the API's own defaults apply.
  list(params: NotesListParams = {}): Promise<RawUserNote[]> {
    const query = buildQuery({ n: params.n, offset: params.offset });
    return this.requestArray<RawUserNote>(`/userNotes${query}`);
  }

  // Page GET /userNotes to exhaustion (n=100). Multiple requests by design.
  listAll(): Promise<RawUserNote[]> {
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
