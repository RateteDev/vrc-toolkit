// Shared upstream-timeout guard for transports. A stalled VRChat connection
// would otherwise hang (or surface as a raw AbortError); this turns it into a
// typed 504 VrcError so every transport fails the same, catchable way.

import { VrcError } from "../response";

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new VrcError("upstream VRChat request timed out", 504, "");
    }
    throw err;
  }
}
