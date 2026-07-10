// Print list projection and sorting (spec No.26). All pure over in-memory
// print data.

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
