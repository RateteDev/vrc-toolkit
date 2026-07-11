// Pure filter / sort / group logic for the friends list. Network-free and
// UI-free so it can be unit-tested in isolation.

import { isJoinable, parseLocation } from "@vrc-toolkit/core/domain";
import type { Person } from "./people";

export type PresenceFilter = "online" | "all";
export type SortMode = "default" | "name" | "status";

export interface FriendFilter {
  search: string;
  presence: PresenceFilter;
}

// Presence-status sort priority (join me first, offline last), mirroring how
// VRChat surfaces the most-joinable friends at the top.
const STATUS_PRIORITY: Record<string, number> = {
  "join me": 0,
  active: 1,
  "ask me": 2,
  busy: 3,
};

export function isPersonJoinable(p: Person): boolean {
  return p.isOnline && isJoinable(parseLocation(p.location));
}

export function countByPresence(people: Person[]): {
  online: number;
  all: number;
} {
  let online = 0;
  for (const p of people) {
    if (p.isOnline) online++;
  }
  return { online, all: people.length };
}

export function filterPeople(people: Person[], f: FriendFilter): Person[] {
  const needle = f.search.trim().toLowerCase();
  return people.filter((p) => {
    if (f.presence === "online" && !p.isOnline) return false;
    if (needle && !p.displayName.toLowerCase().includes(needle)) return false;
    return true;
  });
}

export function sortPeople(people: Person[], mode: SortMode): Person[] {
  const list = [...people];
  if (mode === "name") {
    list.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return list;
  }
  if (mode === "status") {
    list.sort((a, b) => {
      const pa = a.isOnline ? (STATUS_PRIORITY[a.status] ?? 4) : 5;
      const pb = b.isOnline ? (STATUS_PRIORITY[b.status] ?? 4) : 5;
      if (pa !== pb) return pa - pb;
      return a.displayName.localeCompare(b.displayName);
    });
    return list;
  }
  // "default": online-first, then by display name (the buildPeople order).
  list.sort((a, b) => {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    return a.displayName.localeCompare(b.displayName);
  });
  return list;
}

export interface WorldGroup {
  key: string;
  // Resolved world name, or null while unresolved / not an instance world.
  worldName: string | null;
  members: Person[];
}

// Group online friends who are in a joinable/instance world by that world;
// everyone else (private, traveling, offline, or unresolved-non-instance) falls
// into a trailing "その他" group. Named groups are ordered by member count
// desc; within a group, members keep the incoming order.
export function groupByWorld(
  people: Person[],
  nameOf: (worldId: string | null | undefined) => string | undefined,
): WorldGroup[] {
  const byWorld = new Map<string, Person[]>();
  const others: Person[] = [];
  for (const p of people) {
    const parsed = parseLocation(p.location);
    if (p.isOnline && parsed.kind === "instance" && parsed.worldId) {
      const arr = byWorld.get(parsed.worldId);
      if (arr) arr.push(p);
      else byWorld.set(parsed.worldId, [p]);
    } else {
      others.push(p);
    }
  }
  const groups: WorldGroup[] = Array.from(byWorld.entries()).map(([worldId, members]) => ({
    key: worldId,
    worldName: nameOf(worldId) ?? null,
    members,
  }));
  groups.sort((a, b) => b.members.length - a.members.length);
  if (others.length) groups.push({ key: "__other__", worldName: null, members: others });
  return groups;
}
