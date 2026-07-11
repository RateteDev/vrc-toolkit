import { describe, expect, test } from "bun:test";
import { recorder, replyJson } from "./_testutil";
import { PrintsResource } from "./prints";

describe("PrintsResource.list", () => {
  test("no params -> bare /prints/user/{userId}, url-encodes the id", async () => {
    const { transport, calls } = recorder(replyJson([]));
    await new PrintsResource(transport).list("usr_1");
    expect(calls[0]?.path).toBe("/prints/user/usr_1");
  });

  test("builds the n/offset query string", async () => {
    const { transport, calls } = recorder(replyJson([]));
    await new PrintsResource(transport).list("usr_1", { n: 100, offset: 0 });
    expect(calls[0]?.path).toBe("/prints/user/usr_1?n=100&offset=0");
  });

  test("normalizes a non-array body to []", async () => {
    const { transport } = recorder(replyJson(null));
    expect(await new PrintsResource(transport).list("usr_1")).toEqual([]);
  });
});

describe("PrintsResource.upload", () => {
  test("POST /prints multipart: image field + default timestamp", async () => {
    const { transport, calls } = recorder(replyJson({ id: "prnt_1" }));
    await new PrintsResource(transport).upload({
      image: new Blob(["x"], { type: "image/png" }),
      filename: "shot.png",
    });
    expect(calls[0]?.path).toBe("/prints");
    expect(calls[0]?.init?.method).toBe("POST");
    const form = calls[0]?.init?.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    const image = form.get("image");
    expect(image).toBeInstanceOf(Blob);
    expect((image as File).name).toBe("shot.png");
    // Default timestamp is now truncated to .000Z precision.
    expect(String(form.get("timestamp"))).toMatch(/\.000Z$/);
    expect(form.has("note")).toBe(false);
    expect(form.has("worldId")).toBe(false);
    expect(form.has("worldName")).toBe(false);
  });

  test("includes explicit timestamp/note/world fields when provided", async () => {
    const { transport, calls } = recorder(replyJson({ id: "prnt_1" }));
    await new PrintsResource(transport).upload({
      image: new Blob(["x"]),
      filename: "a.png",
      timestamp: "2026-01-02T03:04:05.000Z",
      note: "hi",
      worldId: "wrld_1",
      worldName: "Home",
    });
    const form = calls[0]?.init?.body as FormData;
    expect(form.get("timestamp")).toBe("2026-01-02T03:04:05.000Z");
    expect(form.get("note")).toBe("hi");
    expect(form.get("worldId")).toBe("wrld_1");
    expect(form.get("worldName")).toBe("Home");
  });
});

describe("PrintsResource.delete", () => {
  test("DELETE /prints/{id}, url-encodes the id", async () => {
    const { transport, calls } = recorder(replyJson({}));
    await new PrintsResource(transport).delete("prnt a/b");
    expect(calls[0]?.path).toBe("/prints/prnt%20a%2Fb");
    expect(calls[0]?.init?.method).toBe("DELETE");
  });
});

describe("PrintsResource.listAll", () => {
  test("pages with n=100 until a short page", async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => ({ id: `p${i}` }));
    const { transport, calls } = recorder(({ path }) => {
      const offset = new URL(`https://x${path}`).searchParams.get("offset");
      const body = offset === "0" ? fullPage : [{ id: "last" }];
      return new Response(JSON.stringify(body), { status: 200 });
    });
    const all = await new PrintsResource(transport).listAll("usr_1");
    expect(all).toHaveLength(101);
    expect(calls.map((c) => c.path)).toEqual([
      "/prints/user/usr_1?n=100&offset=0",
      "/prints/user/usr_1?n=100&offset=100",
    ]);
  });

  test("an endpoint that ignores offset terminates after one repeated page", async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => ({ id: `p${i}` }));
    const { transport, calls } = recorder(replyJson(fullPage));
    const all = await new PrintsResource(transport).listAll("usr_1");
    expect(all).toHaveLength(100);
    expect(calls).toHaveLength(2);
  });

  test("a full page without ids is taken once, then paging stops", async () => {
    const anonymousPage = Array.from({ length: 100 }, () => ({ note: "x" }));
    const { transport, calls } = recorder(replyJson(anonymousPage));
    const all = await new PrintsResource(transport).listAll("usr_1");
    expect(all).toHaveLength(100);
    expect(calls).toHaveLength(1);
  });
});
