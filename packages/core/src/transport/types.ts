// The transport contract. A transport decides where requests go and how the
// session is authenticated (browser session reuse, credential login, ...);
// namespaces call it without knowing which one is in use.

export interface VrcTransport {
  // Perform an authenticated request against the VRChat API. `path` is the
  // API path relative to the transport's base (e.g. "/auth/user"); the
  // transport prepends its own base URL and applies its auth scheme.
  // Contract: `path` must already be URL-encoded by the caller (the
  // namespaces layer) — transports do not encode it.
  fetch(path: string, init?: RequestInit): Promise<Response>;
}
