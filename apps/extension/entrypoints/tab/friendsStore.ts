// Shared friends+notes store, modeled on worldNames.ts's module-level store +
// useSyncExternalStore hook. The フレンド tab and the JOIN先 tab both render
// from the same friend list, so this store is the single fetch point: two
// views mounting at once (Layout keeps every tab mounted, just hidden) must
// not double the request load against the unofficial API.

import type { VrcClient } from "@vrc-toolkit/core";
import { toFriendSummary } from "@vrc-toolkit/core/domain";
import { useSyncExternalStore } from "react";
import { applyNoteUpdate, buildPeople, type Person } from "./views/friends/people";

export interface FriendsSnapshot {
  people: Person[];
  status: string | null;
  lastUpdate: Date | null;
}

class FriendsStore {
  private people: Person[] = [];
  private status: string | null = "読み込み中…";
  private lastUpdate: Date | null = null;
  private loading = false;
  private loadedOnce = false;
  private version = 0;
  private listeners = new Set<() => void>();

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  getVersion = (): number => this.version;

  getSnapshot = (): FriendsSnapshot => ({
    people: this.people,
    status: this.status,
    lastUpdate: this.lastUpdate,
  });

  private emit(): void {
    this.version++;
    for (const cb of this.listeners) cb();
  }

  // Fetch friends + notes and rebuild the merged list. A second call while one
  // is already in flight is a no-op: both views can call this from a "更新"
  // button without ever issuing overlapping requests.
  load(client: VrcClient): void {
    if (this.loading) return;
    this.loading = true;
    this.loadedOnce = true;
    this.status = "読み込み中…";
    this.emit();
    // Online friends and notes: both paged to exhaustion, so friend counts
    // beyond one page (100) are not silently truncated.
    Promise.all([client.friends.listAll({ offline: false }), client.notes.listAll()])
      .then(([friends, notes]) => {
        this.people = buildPeople(friends.map(toFriendSummary), notes);
        this.lastUpdate = new Date();
        this.status = null;
      })
      .catch((e: unknown) => {
        this.status = `ネットワークエラー: ${e instanceof Error ? e.message : String(e)}`;
      })
      .finally(() => {
        this.loading = false;
        this.emit();
      });
  }

  // Load only if never attempted before. Both views call this from their mount
  // effect; whichever mounts first performs the fetch, the other sees it via
  // the shared snapshot.
  ensureLoaded(client: VrcClient): void {
    if (this.loadedOnce) return;
    this.load(client);
  }

  // Reflect a persisted note upsert into the list without refetching: the
  // upsert response already confirms the value, so a reload would spend
  // requests to learn what we know. The merge rule lives in applyNoteUpdate
  // (pure, unit-tested) next to buildPeople, whose semantics it mirrors.
  updateNote(userId: string, note: string): void {
    this.people = applyNoteUpdate(this.people, userId, note);
    this.emit();
  }
}

export const friendsStore = new FriendsStore();

export function useFriends(): FriendsSnapshot {
  useSyncExternalStore(friendsStore.subscribe, friendsStore.getVersion, friendsStore.getVersion);
  return friendsStore.getSnapshot();
}
