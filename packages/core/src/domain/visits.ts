// World-visit reconciliation (spec No.9): fold observed instance presences into
// open/closed intervals.

// Typed visit interval (camelCase; leftAt=null means still present). Minimal
// shape defined locally: the domain layer does not depend on any DB module.
export interface Visit {
  subjectId: string;
  worldId: string;
  worldName: string | null;
  instanceId: string;
  instanceType: string | null;
  region: string | null;
  enteredAt: string;
  leftAt: string | null;
}

// An open world_visit interval as read from storage: the typed visit plus its
// row id (needed so reconcile can name which rows to continue/close).
export interface OpenVisit extends Visit {
  id: number;
}

// A freshly observed instance presence to fold into intervals. instanceId is
// null for non-instance observations (e.g. traveling/private) that must not
// open a row.
export interface ObservedVisit {
  subjectId: string;
  worldId: string;
  worldName: string | null;
  instanceId: string | null;
  instanceType: string | null;
  region: string | null;
}

// The reconcile decision: which open rows to close, which new rows to open, and
// which open rows to leave untouched (continue).
export interface VisitReconcile {
  toClose: number[];
  toOpen: Visit[];
  toContinue: number[];
}

// An observed presence known to be inside an instance (instanceId narrowed
// from string | null to string).
type ObservedInstanceVisit = ObservedVisit & { instanceId: string };

function hasInstance(o: ObservedVisit): o is ObservedInstanceVisit {
  return o.instanceId !== null;
}

// PURE: reconcile open intervals against the current observations at time `now`.
// An open interval continues when the same subject is still observed in the
// SAME world_id:instance_id; otherwise it closes. A freshly observed instance
// (non-null instanceId) with no matching open interval opens a new row.
// Observations with a null instanceId (traveling/private) are ignored: they
// neither continue nor open an interval.
export function reconcileVisits(
  openVisits: OpenVisit[],
  observed: ObservedVisit[],
  now: string,
): VisitReconcile {
  const observedByKey = new Map<string, ObservedInstanceVisit>();
  for (const o of observed) {
    if (!hasInstance(o)) continue;
    observedByKey.set(visitKey(o.subjectId, o.worldId, o.instanceId), o);
  }

  const toContinue: number[] = [];
  const toClose: number[] = [];
  const matchedKeys = new Set<string>();
  for (const open of openVisits) {
    const key = visitKey(open.subjectId, open.worldId, open.instanceId);
    if (observedByKey.has(key)) {
      toContinue.push(open.id);
      matchedKeys.add(key);
    } else {
      toClose.push(open.id);
    }
  }

  const toOpen: Visit[] = [];
  for (const [key, o] of observedByKey) {
    if (matchedKeys.has(key)) continue;
    toOpen.push({
      subjectId: o.subjectId,
      worldId: o.worldId,
      worldName: o.worldName,
      instanceId: o.instanceId,
      instanceType: o.instanceType,
      region: o.region,
      enteredAt: now,
      leftAt: null,
    });
  }

  return { toClose, toOpen, toContinue };
}

// PURE: identity of an interval = subject in a specific world instance.
function visitKey(subjectId: string, worldId: string, instanceId: string): string {
  return `${subjectId} ${worldId} ${instanceId}`;
}
