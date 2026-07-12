// Pure grouping logic for WorldModal: split a world's joinable members into
// per-instance rows. Network-free and UI-free so it can be unit-tested in
// isolation, matching the pattern in ../friends/organize.ts.

import type { Person } from "../friends/people";

export interface InstanceRow {
  // The member's raw location string (worldId:instanceId, colon preserved),
  // reused verbatim as the self-invite target for this instance.
  location: string;
  members: Person[];
}

// Group a world's members by their exact location string (same worldId is
// assumed already, per the WorldCard/JoinView grouping by worldId — different
// instanceIds within one world naturally produce different location strings).
// Rows are ordered by descending member count; members keep incoming order.
export function groupMembersByInstance(members: Person[]): InstanceRow[] {
  const byLocation = new Map<string, Person[]>();
  for (const p of members) {
    const arr = byLocation.get(p.location);
    if (arr) arr.push(p);
    else byLocation.set(p.location, [p]);
  }
  const rows: InstanceRow[] = Array.from(byLocation.entries()).map(([location, ms]) => ({
    location,
    members: ms,
  }));
  rows.sort((a, b) => b.members.length - a.members.length);
  return rows;
}
