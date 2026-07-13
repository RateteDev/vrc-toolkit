import { describe, expect, test } from "bun:test";
import { recorder, replyJson } from "./_testutil";
import { GroupsResource } from "./groups";

describe("GroupsResource.userGroups", () => {
  test("GET /users/{userId}/groups, url-encodes the id", async () => {
    const groups = [{ groupId: "grp_1", name: "月見の会" }];
    const { transport, calls } = recorder(replyJson(groups));
    const result = await new GroupsResource(transport).userGroups("usr a/b");
    expect(calls[0]?.path).toBe("/users/usr%20a%2Fb/groups");
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");
    expect(result).toEqual(groups);
  });

  test("normalizes a non-array body to []", async () => {
    const { transport } = recorder(replyJson(null));
    expect(await new GroupsResource(transport).userGroups("usr_1")).toEqual([]);
  });
});

describe("GroupsResource.posts", () => {
  test("GET /groups/{groupId}/posts?n=&offset=, url-encodes the id", async () => {
    const page = { posts: [{ id: "gpo_1", title: "お知らせ" }], total: 42 };
    const { transport, calls } = recorder(replyJson(page));
    const result = await new GroupsResource(transport).posts("grp x/y", { n: 10, offset: 20 });
    expect(calls[0]?.path).toBe("/groups/grp%20x%2Fy/posts?n=10&offset=20");
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");
    expect(result).toEqual(page);
  });

  test("returns null when a 200 body is not JSON", async () => {
    const { transport } = recorder(replyJson(null));
    expect(await new GroupsResource(transport).posts("grp_1", { n: 10, offset: 0 })).toBeNull();
  });
});

describe("GroupsResource.userGroupInstances", () => {
  test("GET /users/{userId}/instances/groups, url-encodes the id", async () => {
    const body = { fetchedAt: "2026-07-13T00:00:00Z", instances: [{ instanceId: "42" }] };
    const { transport, calls } = recorder(replyJson(body));
    const result = await new GroupsResource(transport).userGroupInstances("usr a/b");
    expect(calls[0]?.path).toBe("/users/usr%20a%2Fb/instances/groups");
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");
    expect(result).toEqual(body);
  });

  test("returns null when a 200 body is not JSON", async () => {
    const { transport } = recorder(replyJson(null));
    expect(await new GroupsResource(transport).userGroupInstances("usr_1")).toBeNull();
  });
});
