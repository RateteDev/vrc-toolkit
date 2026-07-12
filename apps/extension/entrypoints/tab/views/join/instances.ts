// Pure grouping + view-model logic for the JOIN先 instance rows (shared by
// WorldCard and WorldModal). Network-free and UI-free so it can be
// unit-tested in isolation, matching the pattern in ../friends/organize.ts.

import type { VRChatInstance } from "@vrc-toolkit/core";
import { type InstanceAccess, parseInstanceAccess } from "@vrc-toolkit/core/domain";
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

export interface InstanceRowViewModel {
  location: string;
  members: Person[];
  // Null only for a non-instance location, which groupMembersByInstance never
  // produces (every row comes from an online member's instance location).
  access: InstanceAccess | null;
  // "n/capacity人", or null while the instance detail has not resolved yet.
  occupancyLabel: string | null;
  // Non-null reason to disable the JOIN button, derived from resolved
  // instance detail only. Null (enabled) while the detail is still loading,
  // per the JOIN先 UX: don't block joining on the slower per-instance fetch.
  joinDisabledReason: string | null;
}

// Project a grouped instance row + its (possibly not-yet-loaded) instance
// detail into the shape InstanceRowCard renders. `instance` is undefined
// while instanceStore has not resolved this location yet.
export function toInstanceRowViewModel(
  row: InstanceRow,
  instance: VRChatInstance | undefined,
): InstanceRowViewModel {
  const occupancyLabel =
    typeof instance?.n_users === "number" && typeof instance?.capacity === "number"
      ? `${instance.n_users}/${instance.capacity}人`
      : null;

  let joinDisabledReason: string | null = null;
  if (instance?.hasCapacityForYou === false) joinDisabledReason = "満員";
  else if (instance?.ageGate === true) joinDisabledReason = "年齢制限";

  return {
    location: row.location,
    members: row.members,
    access: parseInstanceAccess(row.location),
    occupancyLabel,
    joinDisabledReason,
  };
}
