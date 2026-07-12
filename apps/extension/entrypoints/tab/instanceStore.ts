// Instance detail lookup with a gentle request pace, memory-only.
//
// Same pace-controlled queue/pump shape as worldStore, but occupancy/capacity
// data is volatile (changes as members join/leave), so unlike worldStore this
// store never persists to localStorage: a cached count would go stale the
// moment it is read back on a later session. `clear()` lets the JOIN先 更新
// button force a fresh fetch for instances already shown this session.

import type { VRChatInstance, VrcClient } from "@vrc-toolkit/core";
import { useSyncExternalStore } from "react";

// Delay between instance lookups. Mirrors worldStore's REQUEST_DELAY_MS: 100ms
// keeps the load bounded (requests are serial) while letting rows fill in
// quickly as they resolve.
const REQUEST_DELAY_MS = 100;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class InstanceStore {
  private cache = new Map<string, VRChatInstance>();
  private queue: string[] = [];
  private queued = new Set<string>();
  // Locations that errored this session (e.g. an instance that closed) — not
  // retried until clear(), to avoid hammering the API for a dead instance.
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

  getEntry(location: string): VRChatInstance | undefined {
    return this.cache.get(location);
  }

  // Enqueue an unresolved location. Cached / failed / already-queued
  // locations are no-ops, so callers can request every visible row's location
  // on every render.
  request(client: VrcClient, location: string): void {
    if (!location) return;
    if (this.cache.has(location) || this.queued.has(location) || this.failed.has(location)) return;
    this.queued.add(location);
    this.queue.push(location);
    void this.pump(client);
  }

  // Drop all cached/failed/queued state so the next request() for a
  // known location re-fetches. Used by the JOIN先 更新 button: occupancy is
  // volatile, so a manual refresh should not keep serving stale numbers.
  clear(): void {
    this.cache.clear();
    this.queue = [];
    this.queued.clear();
    this.failed.clear();
    this.emit();
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
        const location = this.queue.shift();
        if (location === undefined) break;
        this.queued.delete(location);
        try {
          const instance = await client.instances.get(location);
          if (instance) {
            this.cache.set(location, instance);
            this.emit();
          } else {
            this.failed.add(location);
          }
        } catch {
          this.failed.add(location);
        }
        if (this.queue.length) await delay(REQUEST_DELAY_MS);
      }
    } finally {
      this.pumping = false;
    }
  }
}

export const instanceStore = new InstanceStore();

// Subscribe a component to resolution updates and get a stable per-location
// instance-detail lookup.
export function useInstanceEntries(): (location: string) => VRChatInstance | undefined {
  useSyncExternalStore(instanceStore.subscribe, instanceStore.getVersion, instanceStore.getVersion);
  return (location) => instanceStore.getEntry(location);
}
