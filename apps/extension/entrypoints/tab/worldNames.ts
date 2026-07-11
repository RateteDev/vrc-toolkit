// World lookup with a persistent cache and a gentle request pace.
//
// Friend cards only carry a worldId; the display name and thumbnail need
// GET /worlds/{id}. To honor the unofficial-API load policy this store
// resolves ids one at a time with a short delay between requests, skips ids
// already known or failed, and persists the id→entry map to localStorage so
// steady-state runs issue almost no requests. Entries emit as they arrive so
// the list renders progressively.

import type { VrcClient } from "@vrc-toolkit/core";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "vrct.worlds.v2";
// Superseded by STORAGE_KEY (name-only → name+thumbnail). Not migrated: the
// cache rebuilds quickly at the existing request pace, and carrying forward a
// bespoke migration for a purely-cosmetic cache is not worth the complexity.
const OLD_STORAGE_KEY = "vrct.worldNames.v1";
// Delay between world lookups. 100ms (≈10 req/s) is a deliberate choice over a
// more conservative 200-500ms: entries are resolved serially and drawn as they
// arrive, so a longer delay would make the first few visible entries feel slow.
// The load stays bounded because requests are sequential, unresolved ids are
// cached in `failed` (no retry storms), and resolved entries persist across
// sessions — so steady-state runs issue almost none. Revisit if it feels heavy.
const REQUEST_DELAY_MS = 100;
// Cap the persisted cache so it cannot grow without bound over long-term use.
// Oldest (least-recently-inserted) entries are dropped first.
const MAX_CACHE = 2000;

export interface WorldEntry {
  name: string;
  thumbnailImageUrl: string | null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadCache(): Map<string, WorldEntry> {
  try {
    // No migration path from v1 (see OLD_STORAGE_KEY comment): drop it so it
    // does not linger in storage forever.
    localStorage.removeItem(OLD_STORAGE_KEY);
  } catch {
    // localStorage may be unavailable; nothing to clean up in that case.
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    return new Map(Object.entries(JSON.parse(raw) as Record<string, WorldEntry>));
  } catch {
    return new Map();
  }
}

class WorldStore {
  private cache = loadCache();
  private queue: string[] = [];
  private queued = new Set<string>();
  // Ids that returned no name (404/private) this session — not retried until a
  // reload, to avoid hammering the API for permanently-unresolvable worlds.
  private failed = new Set<string>();
  private pumping = false;
  private version = 0;
  private listeners = new Set<() => void>();

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  getVersion = (): number => this.version;

  getEntry(worldId: string): WorldEntry | undefined {
    return this.cache.get(worldId);
  }

  getName(worldId: string): string | undefined {
    return this.cache.get(worldId)?.name;
  }

  // Enqueue an unknown worldId for resolution. Cached / failed / already-queued
  // ids are no-ops, so callers can request the whole visible list every render.
  request(client: VrcClient, worldId: string): void {
    if (!worldId) return;
    if (this.cache.has(worldId) || this.queued.has(worldId) || this.failed.has(worldId)) return;
    this.queued.add(worldId);
    this.queue.push(worldId);
    void this.pump(client);
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(this.cache)));
    } catch {
      // localStorage may be unavailable/full; the in-memory cache still works.
    }
  }

  private emit(): void {
    this.version++;
    for (const cb of this.listeners) cb();
  }

  private async pump(client: VrcClient): Promise<void> {
    if (this.pumping) return;
    this.pumping = true;
    try {
      while (this.queue.length) {
        const id = this.queue.shift();
        if (id === undefined) break;
        this.queued.delete(id);
        try {
          const world = await client.worlds.get(id);
          if (world?.name) {
            this.cache.set(id, {
              name: world.name,
              thumbnailImageUrl: world.thumbnailImageUrl ?? world.imageUrl ?? null,
            });
            while (this.cache.size > MAX_CACHE) {
              const oldest = this.cache.keys().next().value;
              if (oldest === undefined) break;
              this.cache.delete(oldest);
            }
            this.persist();
            this.emit();
          } else {
            this.failed.add(id);
          }
        } catch {
          this.failed.add(id);
        }
        if (this.queue.length) await delay(REQUEST_DELAY_MS);
      }
    } finally {
      this.pumping = false;
    }
  }
}

export const worldStore = new WorldStore();

// Subscribe a component to resolution updates and get a stable name lookup.
export function useWorldNames(): (id: string | null | undefined) => string | undefined {
  useSyncExternalStore(worldStore.subscribe, worldStore.getVersion, worldStore.getVersion);
  return (id) => (id ? worldStore.getName(id) : undefined);
}

// Subscribe a component to resolution updates and get a stable whole-entry
// lookup (name + thumbnail), for views that also need the thumbnail image.
export function useWorldEntries(): (id: string | null | undefined) => WorldEntry | undefined {
  useSyncExternalStore(worldStore.subscribe, worldStore.getVersion, worldStore.getVersion);
  return (id) => (id ? worldStore.getEntry(id) : undefined);
}
