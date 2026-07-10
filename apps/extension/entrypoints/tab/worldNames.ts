// World-name resolution with a persistent cache and a gentle request pace.
//
// Friend cards only carry a worldId; the display name needs GET /worlds/{id}.
// To honor the unofficial-API load policy this store resolves ids one at a time
// with a short delay between requests, skips ids already known or failed, and
// persists the id→name map to localStorage so steady-state runs issue almost no
// requests. Names emit as they arrive so the list renders progressively.

import type { VrcClient } from "@vrc-toolkit/core";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "vrct.worldNames.v1";
const REQUEST_DELAY_MS = 100;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadCache(): Map<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    return new Map(Object.entries(JSON.parse(raw) as Record<string, string>));
  } catch {
    return new Map();
  }
}

class WorldNameStore {
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

  getName(worldId: string): string | undefined {
    return this.cache.get(worldId);
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
          const name = (await client.worlds.get(id))?.name;
          if (name) {
            this.cache.set(id, name);
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

export const worldNameStore = new WorldNameStore();

// Subscribe a component to resolution updates and get a stable name lookup.
export function useWorldNames(): (id: string | null | undefined) => string | undefined {
  useSyncExternalStore(
    worldNameStore.subscribe,
    worldNameStore.getVersion,
    worldNameStore.getVersion,
  );
  return (id) => (id ? worldNameStore.getName(id) : undefined);
}
