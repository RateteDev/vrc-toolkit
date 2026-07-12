import { describe, expect, test } from "bun:test";
import { recorder, replyJson } from "./_testutil";
import { InventoryResource } from "./inventory";

describe("InventoryResource.list", () => {
  test("no n/offset -> bare /inventory?types=..., returns the raw envelope", async () => {
    const { transport, calls } = recorder(replyJson({ data: [{ id: "inv_1" }], totalCount: 1 }));
    const res = await new InventoryResource(transport).list("sticker");
    expect(calls[0]?.path).toBe("/inventory?types=sticker");
    expect(res).toEqual({ data: [{ id: "inv_1" }], totalCount: 1 });
  });

  test("url-encodes types and respects n/offset overrides", async () => {
    const { transport, calls } = recorder(replyJson({ data: [] }));
    await new InventoryResource(transport).list("emoji,sticker", { n: 50, offset: 50 });
    expect(calls[0]?.path).toBe("/inventory?types=emoji%2Csticker&n=50&offset=50");
  });

  test("a 200 with a non-JSON body yields null", async () => {
    const { transport } = recorder(() => new Response("not json", { status: 200 }));
    expect(await new InventoryResource(transport).list("sticker")).toBeNull();
  });
});

describe("InventoryResource.listAll", () => {
  test("flattens data across pages until a short page", async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => ({ id: `inv${i}` }));
    const { transport, calls } = recorder(({ path }) => {
      const offset = new URL(`https://x${path}`).searchParams.get("offset");
      const body = offset === "0" ? { data: fullPage } : { data: [{ id: "inv_last" }] };
      return new Response(JSON.stringify(body), { status: 200 });
    });
    const all = await new InventoryResource(transport).listAll("sticker");
    expect(all).toHaveLength(101);
    expect(calls.map((c) => c.path)).toEqual([
      "/inventory?types=sticker&n=100&offset=0",
      "/inventory?types=sticker&n=100&offset=100",
    ]);
  });

  test("an endpoint that ignores offset terminates after one repeated page", async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => ({ id: `inv${i}` }));
    const { transport, calls } = recorder(replyJson({ data: fullPage }));
    const all = await new InventoryResource(transport).listAll("sticker");
    expect(all).toHaveLength(100);
    expect(calls).toHaveLength(2);
  });

  test("a null envelope yields []", async () => {
    const { transport } = recorder(() => new Response("not json", { status: 200 }));
    expect(await new InventoryResource(transport).listAll("sticker")).toEqual([]);
  });
});
