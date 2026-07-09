// Session-reuse transport. Rides on the user's existing vrchat.com login by
// sending same-origin requests with `credentials: "include"`; it holds no
// credentials and sets no auth headers (the browser attaches its own cookies
// and User-Agent). Verified read+write on Chrome and Firefox.

import { fetchWithTimeout } from "./timeout";
import type { VrcTransport } from "./types";

// Canonical base for the session-reuse path. Not a config value: this is the
// origin the browser is already authenticated against. Overridable for tests.
const SESSION_API_BASE = "https://vrchat.com/api/1";

// Upstream request timeout, matching credentialsTransport (see fetchWithTimeout).
const REQUEST_TIMEOUT_MS = 15000;

export interface SessionTransportOptions {
  baseUrl?: string;
}

export function sessionTransport(options: SessionTransportOptions = {}): VrcTransport {
  const baseUrl = options.baseUrl ?? SESSION_API_BASE;
  return {
    fetch(path, init) {
      return fetchWithTimeout(
        `${baseUrl}${path}`,
        { ...init, credentials: "include" },
        REQUEST_TIMEOUT_MS,
      );
    },
  };
}
