// Unit tests for the notes hub + business card pure helpers (spec No.30 /
// No.31): mergeNotesWithTags(notes, tagRows), fmtNote(note) and
// fmtCard(user, localTags). PURE only: plain objects / row arrays, no network,
// no DB.
//
//   - mergeNotesWithTags: attach local note_tag rows onto UserNote list by
//     target user id. Cases: tagged target / untagged target / multi-tag /
//     orphan tag (tag row whose target has no note).
//   - fmtNote: format a UserNote for display; targetUser missing -> fallback
//     display name (the bare targetUserId).
//   - fmtCard: build a Card from a /users/{id} profile + local tags. Cases:
//     empty last_login / last_activity defensive parse / empty bioLinks /
//     profilePicOverride empty -> currentAvatarThumbnailImageUrl fallback /
//     system tag extraction (language_* / system_*).

import { describe, expect, it } from "bun:test";
import {
  fmtCard,
  fmtNote,
  mergeNotesWithTags,
  type NoteTagRow,
  type RawCardUser,
  type UserNote,
} from "./notes";

function note(over: Partial<UserNote> = {}): UserNote {
  return {
    id: "not_1",
    userId: "usr_self",
    targetUserId: "usr_alice",
    note: "met at world",
    createdAt: "2026-06-01T00:00:00.000Z",
    targetUser: {
      id: "usr_alice",
      displayName: "Alice",
      currentAvatarThumbnailImageUrl: "https://img/alice.png",
    },
    ...over,
  };
}

function tagRow(over: Partial<NoteTagRow> = {}): NoteTagRow {
  return {
    target_user_id: "usr_alice",
    tag: "friend",
    created_at: "2026-06-01T00:00:00.000Z",
    ...over,
  };
}

function cardUser(over: Partial<RawCardUser> = {}): RawCardUser {
  return {
    id: "usr_alice",
    displayName: "Alice",
    bio: "hello bio",
    bioLinks: ["https://twitter.com/alice"],
    statusDescription: "around",
    status: "active",
    pronouns: "she/her",
    date_joined: "2024-01-02",
    last_login: "2026-06-10T12:00:00.000Z",
    last_activity: "2026-06-10T12:30:00.000Z",
    tags: ["system_trust_known", "language_eng", "admin_moderator"],
    profilePicOverride: "https://img/override.png",
    currentAvatarThumbnailImageUrl: "https://img/avatar.png",
    note: "my private note",
    ...over,
  };
}

describe("mergeNotesWithTags", () => {
  it("attaches matching local tags to a tagged target", () => {
    const out = mergeNotesWithTags([note()], [tagRow()]);
    expect(out).toHaveLength(1);
    expect(out[0]?.targetUserId).toBe("usr_alice");
    expect(out[0]?.localTags).toEqual(["friend"]);
  });

  it("leaves an untagged target with an empty tag list", () => {
    const out = mergeNotesWithTags([note({ targetUserId: "usr_bob" })], []);
    expect(out).toHaveLength(1);
    expect(out[0]?.localTags).toEqual([]);
  });

  it("collects multiple tags for the same target", () => {
    const out = mergeNotesWithTags(
      [note()],
      [tagRow({ tag: "friend" }), tagRow({ tag: "vrc" }), tagRow({ tag: "artist" })],
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.localTags).toEqual(["friend", "vrc", "artist"]);
  });

  it("ignores orphan tags whose target has no note (no synthetic note row)", () => {
    const out = mergeNotesWithTags(
      [note({ targetUserId: "usr_alice" })],
      [tagRow({ target_user_id: "usr_ghost", tag: "stranger" })],
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.targetUserId).toBe("usr_alice");
    expect(out[0]?.localTags).toEqual([]);
  });

  it("matches tags only to their own target across multiple notes", () => {
    const out = mergeNotesWithTags(
      [note({ targetUserId: "usr_alice" }), note({ id: "not_2", targetUserId: "usr_bob" })],
      [
        tagRow({ target_user_id: "usr_alice", tag: "friend" }),
        tagRow({ target_user_id: "usr_bob", tag: "work" }),
      ],
    );
    const byTarget: Record<string, string[]> = {};
    out.forEach((n) => {
      byTarget[n.targetUserId] = n.localTags;
    });
    expect(byTarget.usr_alice).toEqual(["friend"]);
    expect(byTarget.usr_bob).toEqual(["work"]);
  });
});

describe("fmtNote", () => {
  it("uses the embedded targetUser displayName / thumbnail", () => {
    const out = fmtNote(note());
    expect(out.displayName).toBe("Alice");
    expect(out.thumbnailImageUrl).toBe("https://img/alice.png");
    expect(out.note).toBe("met at world");
    expect(out.targetUserId).toBe("usr_alice");
  });

  it("falls back to the bare targetUserId when targetUser is missing", () => {
    const out = fmtNote(note({ targetUser: undefined }));
    expect(out.displayName).toBe("usr_alice");
    expect(out.thumbnailImageUrl).toBeNull();
  });

  it("falls back when targetUser has no displayName", () => {
    const out = fmtNote(
      note({
        targetUser: { id: "usr_alice", displayName: "", currentAvatarThumbnailImageUrl: "" },
      }),
    );
    expect(out.displayName).toBe("usr_alice");
    expect(out.thumbnailImageUrl).toBeNull();
  });
});

describe("fmtCard", () => {
  it("maps the full profile and merges local tags", () => {
    const out = fmtCard(cardUser(), ["friend", "vrc"]);
    expect(out.displayName).toBe("Alice");
    expect(out.bio).toBe("hello bio");
    expect(out.status).toBe("active");
    expect(out.statusDescription).toBe("around");
    expect(out.pronouns).toBe("she/her");
    expect(out.note).toBe("my private note");
    expect(out.localTags).toEqual(["friend", "vrc"]);
  });

  it("passes the raw timestamps through for relative-time display", () => {
    const out = fmtCard(cardUser(), []);
    expect(out.dateJoinedIso).toBe("2024-01-02");
    expect(out.lastLoginIso).toBe("2026-06-10T12:00:00.000Z");
  });

  it("normalizes missing raw timestamps to ''", () => {
    const out = fmtCard(cardUser({ date_joined: undefined, last_login: undefined }), []);
    expect(out.dateJoinedIso).toBe("");
    expect(out.lastLoginIso).toBe("");
  });

  it("defensively parses an empty last_login / last_activity without throwing", () => {
    const out = fmtCard(cardUser({ last_login: "", last_activity: "" }), []);
    expect(out.lastLogin).toBe("");
  });

  it("tolerates a missing date_joined", () => {
    const out = fmtCard(cardUser({ date_joined: "" }), []);
    expect(out.dateJoined).toBe("");
  });

  it("yields an empty bioLinks array when none are present", () => {
    const out = fmtCard(cardUser({ bioLinks: [] }), []);
    expect(out.bioLinks).toEqual([]);
  });

  it("normalizes a missing bioLinks to an empty array", () => {
    const out = fmtCard(cardUser({ bioLinks: undefined }), []);
    expect(out.bioLinks).toEqual([]);
  });

  it("falls back to currentAvatarThumbnailImageUrl when profilePicOverride is empty", () => {
    const out = fmtCard(cardUser({ profilePicOverride: "" }), []);
    expect(out.imageUrl).toBe("https://img/avatar.png");
  });

  it("prefers profilePicOverride over the avatar thumbnail", () => {
    const out = fmtCard(cardUser(), []);
    expect(out.imageUrl).toBe("https://img/override.png");
  });

  it("extracts only system_* / language_* tags into Card.tags", () => {
    const out = fmtCard(
      cardUser({
        tags: [
          "system_trust_known",
          "language_eng",
          "language_jpn",
          "admin_moderator",
          "show_social_rank",
        ],
      }),
      [],
    );
    expect(out.tags).toEqual(["system_trust_known", "language_eng", "language_jpn"]);
  });

  it("yields empty system tags when none match", () => {
    const out = fmtCard(cardUser({ tags: ["admin_moderator"] }), []);
    expect(out.tags).toEqual([]);
  });
});
