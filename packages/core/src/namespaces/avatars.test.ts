import { describe, expect, test } from "bun:test";
import { VrcError } from "../response";
import { recorder, replyJson } from "./_testutil";
import type { RawListAvatar } from "./avatars";
import { AvatarsResource } from "./avatars";

describe("AvatarsResource.list", () => {
  test("builds the user/releaseStatus/n/offset query", async () => {
    const { transport, calls } = recorder(replyJson([]));
    await new AvatarsResource(transport).list({
      user: "me",
      releaseStatus: "all",
      n: 100,
      offset: 0,
    });
    expect(calls[0]?.path).toBe("/avatars?user=me&releaseStatus=all&n=100&offset=0");
  });

  test("normalizes a non-array body to []", async () => {
    const { transport } = recorder(replyJson(null));
    expect(await new AvatarsResource(transport).list()).toEqual([]);
  });
});

describe("AvatarsResource.listAll", () => {
  test("pages with n=100 until a short page, preserving user/releaseStatus", async () => {
    const fullPage: RawListAvatar[] = Array.from({ length: 100 }, (_, i) => ({ id: `a${i}` }));
    const { transport, calls } = recorder(({ path }) => {
      const offset = new URL(`https://x${path}`).searchParams.get("offset");
      const body = offset === "0" ? fullPage : [{ id: "last" }];
      return new Response(JSON.stringify(body), { status: 200 });
    });
    const all = await new AvatarsResource(transport).listAll({ user: "me", releaseStatus: "all" });
    expect(all).toHaveLength(101);
    expect(calls.map((c) => c.path)).toEqual([
      "/avatars?user=me&releaseStatus=all&n=100&offset=0",
      "/avatars?user=me&releaseStatus=all&n=100&offset=100",
    ]);
  });
});

describe("AvatarsResource.delete", () => {
  test("DELETE /avatars/{avatarId}, url-encodes the id", async () => {
    const { transport, calls } = recorder(replyJson({}));
    await new AvatarsResource(transport).delete("avtr a/b");
    expect(calls[0]?.path).toBe("/avatars/avtr%20a%2Fb");
    expect(calls[0]?.init?.method).toBe("DELETE");
  });

  test("propagates a VrcError on non-200", async () => {
    const { transport } = recorder(replyJson({ error: { message: "not found" } }, 404));
    await expect(new AvatarsResource(transport).delete("avtr_1")).rejects.toThrow(VrcError);
  });
});

describe("AvatarsResource.update", () => {
  test("PUT /avatars/{avatarId} with only the provided fields, url-encodes the id", async () => {
    const { transport, calls } = recorder(replyJson({ id: "avtr_1" }));
    await new AvatarsResource(transport).update("avtr a/b", { name: "New Name" });
    expect(calls[0]?.path).toBe("/avatars/avtr%20a%2Fb");
    expect(calls[0]?.init?.method).toBe("PUT");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({ name: "New Name" });
  });

  test("sends every provided field", async () => {
    const { transport, calls } = recorder(replyJson({ id: "avtr_1" }));
    await new AvatarsResource(transport).update("avtr_1", {
      name: "New Name",
      description: "desc",
      imageUrl: "https://x/img.png",
      releaseStatus: "public",
      tags: ["author_tag_a"],
      version: 2,
    });
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({
      name: "New Name",
      description: "desc",
      imageUrl: "https://x/img.png",
      releaseStatus: "public",
      tags: ["author_tag_a"],
      version: 2,
    });
  });

  test("propagates a VrcError on non-200", async () => {
    const { transport } = recorder(replyJson({ error: { message: "forbidden" } }, 403));
    await expect(new AvatarsResource(transport).update("avtr_1", { name: "x" })).rejects.toThrow(
      VrcError,
    );
  });
});
