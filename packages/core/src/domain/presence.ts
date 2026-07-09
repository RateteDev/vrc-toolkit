// Presence diffing (spec No.3): compare the previous online-friends snapshot
// against the current one and yield only the CHANGED rows to append.

// A friend_presence snapshot. Minimal shape defined locally: the domain layer
// does not depend on any DB module.
export interface Presence {
  userId: string;
  displayName: string;
  status: string;
  isOnline: boolean;
  location: string;
  worldId: string | null;
  instanceId: string | null;
  observedAt: string;
}

// PURE: decide whether a friend counts as online from status + raw location.
// Online requires a non-"offline" status AND a non-sentinel location. An empty
// or "offline" location means not online; the "private"/"traveling" web
// sentinels still count as online (the friend is connected, just not in a
// joinable instance).
export function computeIsOnline(status: string, location: string): boolean {
  if (status === "offline") return false;
  if (location === "" || location === "offline") return false;
  return true;
}

// PURE: given the previous snapshot, the current snapshot (both keyed by
// userId), and the run's observation time, return the presence rows to append.
// A row is appended when the user is newly present, when status/location/isOnline
// changed, or when the user dropped out of the current online set (went
// offline). Unchanged users yield nothing. observedAt is threaded in explicitly
// so synthesized offline rows are stamped at the current run's time even when
// `now` is empty (every friend dropped offline in one poll).
export function diffPresence(prev: Presence[], now: Presence[], observedAt: string): Presence[] {
  const prevById = new Map<string, Presence>();
  for (const p of prev) prevById.set(p.userId, p);
  const nowIds = new Set<string>();
  const rows: Presence[] = [];
  for (const cur of now) {
    nowIds.add(cur.userId);
    const before = prevById.get(cur.userId);
    if (!before || hasChanged(before, cur)) rows.push(cur);
  }
  for (const before of prev) {
    if (nowIds.has(before.userId)) continue;
    rows.push(offlineRow(before, observedAt));
  }
  return rows;
}

// PURE: a presence changed when its online-relevant fields differ.
function hasChanged(before: Presence, cur: Presence): boolean {
  return (
    before.status !== cur.status ||
    before.location !== cur.location ||
    before.isOnline !== cur.isOnline
  );
}

// PURE: synthesize the offline transition row for a friend who dropped out of
// the current online set, stamped at the current run's observation time.
function offlineRow(before: Presence, observedAt: string): Presence {
  return {
    userId: before.userId,
    displayName: before.displayName,
    status: "offline",
    isOnline: false,
    location: "offline",
    worldId: null,
    instanceId: null,
    observedAt,
  };
}
