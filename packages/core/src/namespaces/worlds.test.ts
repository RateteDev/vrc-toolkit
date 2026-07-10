import { describe, expect, test } from "bun:test";
import { recorder, replyJson } from "./_testutil";
import { WorldsResource } from "./worlds";

describe("WorldsResource.get", () => {
  test("GET /worlds/{worldId}, url-encodes the id", async () => {
    const { transport, calls } = recorder(replyJson({ id: "wrld_1", name: "月の海" }));
    const world = await new WorldsResource(transport).get("wrld a/b");
    expect(calls[0]?.path).toBe("/worlds/wrld%20a%2Fb");
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");
    expect(world).toEqual({ id: "wrld_1", name: "月の海" });
  });

  test("returns null when a 200 body is not JSON (empty world)", async () => {
    const { transport } = recorder(replyJson(null));
    expect(await new WorldsResource(transport).get("wrld_x")).toBeNull();
  });
});
