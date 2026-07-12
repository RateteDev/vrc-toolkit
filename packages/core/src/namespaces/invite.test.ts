import { describe, expect, test } from "bun:test";
import { recorder, replyJson } from "./_testutil";
import { InviteResource } from "./invite";

describe("InviteResource.myselfTo", () => {
  test("POST /invite/myself/to/{location} with the location verbatim (colon preserved)", async () => {
    const { transport, calls } = recorder(replyJson(null));
    await new InviteResource(transport).myselfTo("wrld_xxx:12345~region(jp)");
    expect(calls[0]?.path).toBe("/invite/myself/to/wrld_xxx:12345~region(jp)");
    expect(calls[0]?.init?.method).toBe("POST");
  });

  test("rejects a non-instance location before sending a request", async () => {
    const { transport, calls } = recorder(replyJson(null));
    await expect(new InviteResource(transport).myselfTo("offline")).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });

  test("rejects a private/traveling sentinel location before sending a request", async () => {
    const { transport, calls } = recorder(replyJson(null));
    await expect(new InviteResource(transport).myselfTo("traveling")).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });
});
