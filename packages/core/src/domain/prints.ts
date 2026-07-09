// Print list projection, sorting (spec No.26) and retention/rotation selection
// (spec No.29). All pure over in-memory print data.

import type { VRChatPrint } from "../types";

// Minimal shape consumed by sortPrints (a Print summary subset).
export interface SortablePrint {
  createdAt: string | null;
}

// Sort prints by createdAt descending (newest first); entries with a null
// createdAt sort to the end. Pure and non-mutating (returns a new array).
export function sortPrints<T extends SortablePrint>(list: T[]): T[] {
  return list.slice().sort((a, b) => {
    if (a.createdAt === null && b.createdAt === null) return 0;
    if (a.createdAt === null) return 1;
    if (b.createdAt === null) return -1;
    if (a.createdAt < b.createdAt) return 1;
    if (a.createdAt > b.createdAt) return -1;
    return 0;
  });
}

// UI-facing shape for a single print row.
export interface PrintSummary {
  id: string;
  note: string | null;
  worldName: string | null;
  createdAt: string | null;
  imageUrl: string | null;
}

// Narrow a raw print object to the fields the UI needs. imageUrl is passed
// through raw: the extension reuses the user's own vrchat.com session, so the
// image URL needs no auth proxy.
export function toPrintSummary(p: VRChatPrint): PrintSummary {
  return {
    id: p?.id ?? "",
    note: p?.note ?? null,
    worldName: p?.worldName ?? p?.world?.name ?? null,
    createdAt: p?.createdAt ?? p?.timestamp ?? null,
    imageUrl: p?.files?.image ?? p?.image ?? null,
  };
}

export interface RetentionPolicy {
  // Keep only the newest N prints; delete the rest (older than the Nth).
  keepLatest?: number;
  // Delete prints strictly older than this many days from `now`.
  maxAgeDays?: number;
}

// Minimal shape needed to decide deletion: an id and a createdAt. This matches
// the PrintSummary projection (toPrintSummary) used by the gallery/preview path, so
// the `createdAt ?? timestamp` fallback is resolved before selection runs.
export interface RotatablePrint {
  id?: string;
  createdAt?: string | null;
}

// Pure: returns the list of print ids selected for deletion under `policy` as
// of `now`. OR semantics across keepLatest/maxAgeDays; null createdAt kept
// (safe side: never delete what we cannot date).
export function selectPrintsToDelete(
  prints: RotatablePrint[],
  policy: RetentionPolicy,
  now: Date,
): string[] {
  const dated = prints.filter(
    (p): p is RotatablePrint & { createdAt: string } =>
      typeof p.createdAt === "string" && p.createdAt.length > 0,
  );

  const toDelete = new Set<string>();

  // keepLatest: keep the newest N dated prints; select the rest. Null-dated
  // prints never participate in the "latest" window (kept, not counted).
  if (typeof policy.keepLatest === "number") {
    const byNewest = dated
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
    for (const p of byNewest.slice(policy.keepLatest)) {
      if (p.id) toDelete.add(p.id);
    }
  }

  // maxAgeDays: select dated prints strictly older than the threshold. A print
  // exactly maxAgeDays old is kept (boundary inclusive on the keep side).
  if (typeof policy.maxAgeDays === "number") {
    const thresholdMs = policy.maxAgeDays * 24 * 60 * 60 * 1000;
    for (const p of dated) {
      const ageMs = now.getTime() - new Date(p.createdAt).getTime();
      if (ageMs > thresholdMs && p.id) toDelete.add(p.id);
    }
  }

  return Array.from(toDelete);
}
