// Base class for API namespaces. Holds the transport and collapses the
// transport.fetch -> parseVrcResponse boilerplate into request()/requestArray()
// so each namespace method reads as one line = one request.

import { parseVrcResponse } from "./response";
import type { VrcTransport } from "./transport/types";

export abstract class VrcResource {
  constructor(protected readonly transport: VrcTransport) {}

  // Authenticated request parsed as T. The failure message defaults to
  // "<METHOD> <path> failed" so a thrown VrcError is self-describing.
  protected async request<T>(path: string, init?: RequestInit): Promise<T | null> {
    const method = init?.method ?? "GET";
    return parseVrcResponse<T>(await this.transport.fetch(path, init), `${method} ${path} failed`);
  }

  // Request for array responses: normalize a null/non-array body to []
  // (mirrors the Worker's Array.isArray defense on list endpoints).
  protected async requestArray<T>(path: string, init?: RequestInit): Promise<T[]> {
    const data = await this.request<T[]>(path, init);
    return Array.isArray(data) ? data : [];
  }
}
