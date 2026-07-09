// The SDK entry point. A VrcClient is a transport plus a set of endpoint
// namespaces. Namespaces are attached here as they are ported; construction
// takes only a transport so the same client works over session reuse or
// credential login without changing call sites.

import type { VrcTransport } from "./transport/types";

export class VrcClient {
  constructor(readonly transport: VrcTransport) {}
}
