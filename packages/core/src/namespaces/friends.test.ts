import { describe, expect, test } from "bun:test";
import type { VRChatFriend } from "../types";
import { recorder, replyJson } from "./_testutil";
import { FriendsResource } from "./friends";

describe("FriendsResource.list", () => {
  test("no params -> bare /auth/user/friends", async () => {
    const { transport, calls } = recorder(replyJson([]));
    await new FriendsResource(transport).list();
    expect(calls[0]?.path).toBe("/auth/user/friends");
  });

  test("builds the offline/n/offset query string", async () => {
    const { transport, calls } = recorder(replyJson([]));
    await new FriendsResource(transport).list({ offline: false, n: 100, offset: 0 });
    expect(calls[0]?.path).toBe("/auth/user/friends?offline=false&n=100&offset=0");
  });

  test("normalizes a non-array body to []", async () => {
    const { transport } = recorder(replyJson(null));
    expect(await new FriendsResource(transport).list()).toEqual([]);
  });
});

describe("FriendsResource.listAll", () => {
  test("pages with n=100 until a short page, preserving offline", async () => {
    // First page: 100 rows -> keep paging. Second page: 1 row -> stop.
    const fullPage: VRChatFriend[] = Array.from({ length: 100 }, (_, i) => ({ id: `f${i}` }));
    const { transport, calls } = recorder(({ path }) => {
      const offset = new URL(`https://x${path}`).searchParams.get("offset");
      const body = offset === "0" ? fullPage : [{ id: "last" }];
      return new Response(JSON.stringify(body), { status: 200 });
    });
    const all = await new FriendsResource(transport).listAll({ offline: true });
    expect(all).toHaveLength(101);
    expect(calls.map((c) => c.path)).toEqual([
      "/auth/user/friends?offline=true&n=100&offset=0",
      "/auth/user/friends?offline=true&n=100&offset=100",
    ]);
  });
});
