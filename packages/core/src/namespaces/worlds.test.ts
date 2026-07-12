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

describe("WorldsResource.favorites", () => {
  test("GET /worlds/favorites?n={n}", async () => {
    const { transport, calls } = recorder(replyJson([{ id: "wrld_1", name: "月の海" }]));
    const worlds = await new WorldsResource(transport).favorites(50);
    expect(calls[0]?.path).toBe("/worlds/favorites?n=50");
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");
    expect(worlds).toEqual([{ id: "wrld_1", name: "月の海" }]);
  });

  test("normalizes a non-array body to []", async () => {
    const { transport } = recorder(replyJson(null));
    expect(await new WorldsResource(transport).favorites(100)).toEqual([]);
  });
});

describe("WorldsResource.recent", () => {
  test("GET /worlds/recent?n={n}", async () => {
    const { transport, calls } = recorder(replyJson([{ id: "wrld_2", name: "砂漠の遺跡" }]));
    const worlds = await new WorldsResource(transport).recent(50);
    expect(calls[0]?.path).toBe("/worlds/recent?n=50");
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");
    expect(worlds).toEqual([{ id: "wrld_2", name: "砂漠の遺跡" }]);
  });

  test("normalizes a non-array body to []", async () => {
    const { transport } = recorder(replyJson(null));
    expect(await new WorldsResource(transport).recent(100)).toEqual([]);
  });
});
