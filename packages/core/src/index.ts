// Main entry (`@vrc-toolkit/core`): the client, its namespaces, the transport
// contract, and the raw API wire types. Transports and domain helpers are opt-in
// via the `./transport/*` and `./domain` subpaths so consumers pull only what
// they use. Internal plumbing (VrcResource, parseVrcResponse, ApiErrorResponse)
// is not exported here: it is an implementation detail of the namespace classes,
// not part of the consumer-facing surface.

export { VrcClient } from "./client";
export * from "./namespaces/auth";
export * from "./namespaces/avatars";
export * from "./namespaces/files";
export * from "./namespaces/friends";
export * from "./namespaces/inventory";
export * from "./namespaces/notes";
export * from "./namespaces/prints";
export * from "./namespaces/status";
export * from "./namespaces/users";
export { VrcError } from "./response";
export type { VrcTransport } from "./transport/types";
export * from "./types";
