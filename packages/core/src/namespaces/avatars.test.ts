import { describe, expect, test } from "bun:test";
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
