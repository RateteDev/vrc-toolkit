// Verifies the package's subpath exports resolve through the package name (not
// relative paths) for both the runtime (bun) and the type checker (tsc). This is
// the contract every consumer app relies on.

import { describe, expect, test } from "bun:test";
import { VrcClient, VrcError } from "@vrc-toolkit/core";
import { parseLocation, resolveThumbUrl, validateStatus } from "@vrc-toolkit/core/domain";
import { credentialsTransport } from "@vrc-toolkit/core/transport/credentials";
import { sessionTransport } from "@vrc-toolkit/core/transport/session";

describe("subpath exports", () => {
  test("`.` exposes the client, error, and namespace surface", () => {
    expect(typeof VrcClient).toBe("function");
    expect(typeof VrcError).toBe("function");
    const client = new VrcClient(sessionTransport());
    expect(typeof client.auth.currentUser).toBe("function");
    expect(typeof client.friends.listAll).toBe("function");
  });

  test("`./transport/*` resolve to the two transports", () => {
    expect(typeof sessionTransport).toBe("function");
    expect(typeof credentialsTransport).toBe("function");
  });

  test("`./domain` exposes the pure helpers", () => {
    expect(parseLocation("offline")).toEqual({ kind: "offline" });
    expect(typeof validateStatus).toBe("function");
    expect(typeof resolveThumbUrl).toBe("function");
  });
});
