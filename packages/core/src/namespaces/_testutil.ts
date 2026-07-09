// Shared test helper: a recording VrcTransport that captures each call's
// path/init and replays a scripted Response.

import type { VrcTransport } from "../transport/types";

export interface RecordedCall {
  path: string;
  init?: RequestInit;
}

export function recorder(responder: (call: RecordedCall) => Response): {
  transport: VrcTransport;
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];
  return {
    calls,
    transport: {
      fetch(path, init) {
        calls.push({ path, init });
        return Promise.resolve(responder({ path, init }));
      },
    },
  };
}

// Convenience: always reply with the same JSON body and status.
export function replyJson(body: unknown, status = 200): (call: RecordedCall) => Response {
  return () => new Response(JSON.stringify(body), { status });
}
