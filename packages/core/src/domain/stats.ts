// Activity-stats pure aggregations over the history logs (spec No.32). They take
// plain row arrays (already narrowed to camelCase) as arguments so they can be
// unit-tested with no network and no real DB.

// One world_visit interval as consumed by aggregateWorldMinutes. leftAt === null
// (or undefined) marks an open interval (still present), counted up to `now`.
export interface StatVisit {
  worldId: string;
  worldName: string | null;
  enteredAt: string;
  leftAt: string | null;
}

// One aggregated world entry: total minutes spent across all of its intervals.
export interface WorldMinutes {
  worldId: string;
  worldName: string | null;
  minutes: number;
}

// One friend_presence snapshot as consumed by onlineByHour/rankFriendsByOnline.
export interface StatPresence {
  userId: string;
  displayName: string;
  isOnline: boolean;
  observedAt: string;
}

// One friend ranking entry, ordered by online count descending.
export interface FriendOnline {
  userId: string;
  displayName: string;
  minutes: number;
}

// Sum per-world stay minutes across all visit intervals. An interval with
// leftAt === null (or undefined) is treated as open and counted from enteredAt
// up to `now`. Minutes are computed as (leftAt - enteredAt) / 60000. Multiple
// intervals for the same worldId are summed into one entry. Result is sorted by
// minutes descending; an empty input yields an empty array.
export function aggregateWorldMinutes(visits: StatVisit[], now: string): WorldMinutes[] {
  const nowMs = Date.parse(now);
  const byWorld: {
    [worldId: string]: { worldName: string | null; minutes: number };
  } = {};
  const order: string[] = [];
  visits.forEach((visit) => {
    const enteredMs = Date.parse(visit.enteredAt);
    const leftMs = visit.leftAt === null ? nowMs : Date.parse(visit.leftAt);
    const minutes = (leftMs - enteredMs) / 60000;
    let entry = byWorld[visit.worldId];
    if (!entry) {
      entry = { worldName: visit.worldName, minutes: 0 };
      byWorld[visit.worldId] = entry;
      order.push(visit.worldId);
    }
    entry.minutes += minutes;
  });
  return order
    .map((worldId) => {
      const entry = byWorld[worldId];
      return {
        worldId,
        worldName: entry?.worldName ?? null,
        minutes: entry?.minutes ?? 0,
      };
    })
    .sort((a, b) => b.minutes - a.minutes);
}

// Build a 24-element histogram of online observations bucketed by local hour.
// Each presence row with isOnline === true contributes 1 to the bin for the
// local hour of its observedAt, where the local hour is the UTC hour shifted by
// `tz` (an integer offset in hours; may push the time across a day boundary,
// which wraps modulo 24). Offline rows are ignored. Empty input yields 24 zeros.
export function onlineByHour(presenceRows: StatPresence[], tz: number): number[] {
  const bins: number[] = [];
  for (let i = 0; i < 24; i++) bins.push(0);
  presenceRows.forEach((row) => {
    if (!row.isOnline) return;
    const utcHour = new Date(row.observedAt).getUTCHours();
    const localHour = (((utcHour + tz) % 24) + 24) % 24;
    bins[localHour] = (bins[localHour] ?? 0) + 1;
  });
  return bins;
}

// Rank friends by their number of online presence observations, descending.
// Each row with isOnline === true contributes 1 to its userId's count (carried
// in `minutes`). The displayName of the latest observation for a userId wins.
// Ties on count are broken by displayName ascending. Empty input -> [].
export function rankFriendsByOnline(presenceRows: StatPresence[]): FriendOnline[] {
  const byUser: { [userId: string]: { displayName: string; minutes: number } } = {};
  presenceRows.forEach((row) => {
    if (!row.isOnline) return;
    let entry = byUser[row.userId];
    if (!entry) {
      entry = { displayName: row.displayName, minutes: 0 };
      byUser[row.userId] = entry;
    }
    entry.displayName = row.displayName;
    entry.minutes += 1;
  });
  return Object.keys(byUser)
    .map((userId) => {
      const entry = byUser[userId];
      return {
        userId,
        displayName: entry?.displayName ?? "",
        minutes: entry?.minutes ?? 0,
      };
    })
    .sort((a, b) => {
      if (b.minutes !== a.minutes) return b.minutes - a.minutes;
      return a.displayName < b.displayName ? -1 : a.displayName > b.displayName ? 1 : 0;
    });
}
