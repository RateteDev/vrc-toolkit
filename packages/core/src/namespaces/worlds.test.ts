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
  test("pages GET /worlds/favorites?n=100&offset={k} until a short page", async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => ({
      id: `wrld_${i}`,
      favoriteId: `fav_${i}`,
    }));
    const shortPage = Array.from({ length: 30 }, (_, i) => ({
      id: `wrld_s${i}`,
      favoriteId: `fav_s${i}`,
    }));
    const { transport, calls } = recorder(({ path }) => {
      const offset = new URL(`https://x${path}`).searchParams.get("offset");
      const body = offset === "0" ? fullPage : offset === "100" ? shortPage : [];
      return new Response(JSON.stringify(body), { status: 200 });
    });
    const all = await new WorldsResource(transport).favorites();
    expect(all).toHaveLength(130);
    expect(calls.map((c) => c.path)).toEqual([
      "/worlds/favorites?n=100&offset=0",
      "/worlds/favorites?n=100&offset=100",
    ]);
  });

  test("normalizes a non-array page to []", async () => {
    const { transport } = recorder(replyJson(null));
    expect(await new WorldsResource(transport).favorites()).toEqual([]);
  });

  test("an endpoint that ignores offset terminates after one repeated page", async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => ({
      id: `wrld_${i}`,
      favoriteId: `fav_${i}`,
    }));
    const { transport, calls } = recorder(replyJson(fullPage));
    const all = await new WorldsResource(transport).favorites();
    expect(all).toHaveLength(100);
    expect(calls).toHaveLength(2);
  });

  test("a full page without favoriteId/id is taken once, then paging stops", async () => {
    const anonymousPage = Array.from({ length: 100 }, () => ({ name: "x" }));
    const { transport, calls } = recorder(replyJson(anonymousPage));
    const all = await new WorldsResource(transport).favorites();
    expect(all).toHaveLength(100);
    expect(calls).toHaveLength(1);
  });

  test("a partially repeated page contributes only its unseen items", async () => {
    // Page 2 re-serves fav_99 (list shifted upstream) plus 99 new entries, then
    // a short third page ends paging. The repeat must be dropped, not doubled.
    const page1 = Array.from({ length: 100 }, (_, i) => ({
      id: `wrld_${i}`,
      favoriteId: `fav_${i}`,
    }));
    const page2 = [
      { id: "wrld_99", favoriteId: "fav_99" },
      ...Array.from({ length: 99 }, (_, i) => ({ id: `wrld_q${i}`, favoriteId: `fav_q${i}` })),
    ];
    const { transport, calls } = recorder(({ path }) => {
      const offset = new URL(`https://x${path}`).searchParams.get("offset");
      const body = offset === "0" ? page1 : offset === "100" ? page2 : [];
      return new Response(JSON.stringify(body), { status: 200 });
    });
    const all = await new WorldsResource(transport).favorites();
    expect(all).toHaveLength(199);
    expect(all.filter((w) => w.favoriteId === "fav_99")).toHaveLength(1);
    expect(calls).toHaveLength(3);
  });

  test("an empty first page yields [] after one request", async () => {
    const { transport, calls } = recorder(replyJson([]));
    expect(await new WorldsResource(transport).favorites()).toEqual([]);
    expect(calls).toHaveLength(1);
  });
});

describe("WorldsResource.favoriteGroups", () => {
  test("GET /favorite/groups, raw passthrough (all types, unfiltered)", async () => {
    const groups = [
      { name: "worlds1", displayName: "お出かけ用", type: "world", visibility: "private" },
      { name: "avatars1", displayName: "avatars1", type: "avatar", visibility: "private" },
    ];
    const { transport, calls } = recorder(replyJson(groups));
    const result = await new WorldsResource(transport).favoriteGroups();
    expect(calls[0]?.path).toBe("/favorite/groups");
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");
    expect(result).toEqual(groups);
  });

  test("normalizes a non-array body to []", async () => {
    const { transport } = recorder(replyJson(null));
    expect(await new WorldsResource(transport).favoriteGroups()).toEqual([]);
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
