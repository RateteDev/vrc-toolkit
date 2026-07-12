import { describe, expect, test } from "bun:test";
import { recorder, replyJson } from "./_testutil";
import { InstancesResource } from "./instances";

describe("InstancesResource.get", () => {
  test("GET /instances/{location} with the location verbatim (colon and '~' tags preserved)", async () => {
    const { transport, calls } = recorder(
      replyJson({ id: "wrld_xxx:12345~region(jp)", n_users: 3 }),
    );
    const instance = await new InstancesResource(transport).get("wrld_xxx:12345~region(jp)");
    expect(calls[0]?.path).toBe("/instances/wrld_xxx:12345~region(jp)");
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");
    expect(instance).toEqual({ id: "wrld_xxx:12345~region(jp)", n_users: 3 });
  });

  test("rejects a non-instance location before sending a request", async () => {
    const { transport, calls } = recorder(replyJson(null));
    await expect(new InstancesResource(transport).get("offline")).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });

  test("rejects a private/traveling sentinel location before sending a request", async () => {
    const { transport, calls } = recorder(replyJson(null));
    await expect(new InstancesResource(transport).get("traveling")).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });

  test("returns null when a 200 body is not JSON", async () => {
    const { transport } = recorder(replyJson(null));
    expect(await new InstancesResource(transport).get("wrld_x:12345")).toBeNull();
  });
});
