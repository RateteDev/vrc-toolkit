import { describe, expect, test } from "bun:test";
import { recorder, replyJson } from "./_testutil";
import { UsersResource } from "./users";

describe("UsersResource.get", () => {
  test("GET /users/{userId}, url-encodes the id", async () => {
    const { transport, calls } = recorder(replyJson({ id: "usr_1", note: "hi" }));
    const user = await new UsersResource(transport).get("usr a/b");
    expect(calls[0]?.path).toBe("/users/usr%20a%2Fb");
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");
    expect(user).toEqual({ id: "usr_1", note: "hi" });
  });
});

describe("UsersResource.update", () => {
  test("PUT /users/{userId} with only the patched fields in the body", async () => {
    const { transport, calls } = recorder(replyJson({}));
    await new UsersResource(transport).update("usr_1", {
      bio: "一行目\n二行目",
      bioLinks: ["https://example.com"],
      pronouns: "they/them",
    });
    expect(calls[0]?.path).toBe("/users/usr_1");
    expect(calls[0]?.init?.method).toBe("PUT");
    expect(new Headers(calls[0]?.init?.headers).get("content-type")).toBe("application/json");
    expect(calls[0]?.init?.body).toBe(
      JSON.stringify({
        bio: "一行目\n二行目",
        bioLinks: ["https://example.com"],
        pronouns: "they/them",
      }),
    );
  });

  test("omits unspecified fields from the body (statusDescription-only update)", async () => {
    const { transport, calls } = recorder(replyJson({}));
    await new UsersResource(transport).update("usr_1", { statusDescription: "come over" });
    expect(calls[0]?.init?.body).toBe(JSON.stringify({ statusDescription: "come over" }));
  });

  test("url-encodes the userId", async () => {
    const { transport, calls } = recorder(replyJson({}));
    await new UsersResource(transport).update("usr a/b", { status: "active" });
    expect(calls[0]?.path).toBe("/users/usr%20a%2Fb");
  });
});
