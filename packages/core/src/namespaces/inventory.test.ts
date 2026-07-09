import { describe, expect, test } from "bun:test";
import { recorder, replyJson } from "./_testutil";
import { InventoryResource } from "./inventory";

describe("InventoryResource.list", () => {
  test("GET /inventory?types=...&n=100&offset=0, returns the raw envelope", async () => {
    const { transport, calls } = recorder(replyJson({ data: [{ id: "inv_1" }], totalCount: 1 }));
    const res = await new InventoryResource(transport).list("sticker");
    expect(calls[0]?.path).toBe("/inventory?types=sticker&n=100&offset=0");
    expect(res).toEqual({ data: [{ id: "inv_1" }], totalCount: 1 });
  });

  test("url-encodes types and respects n/offset overrides", async () => {
    const { transport, calls } = recorder(replyJson({ data: [] }));
    await new InventoryResource(transport).list("emoji,sticker", { n: 50, offset: 50 });
    expect(calls[0]?.path).toBe("/inventory?types=emoji%2Csticker&n=50&offset=50");
  });
});
