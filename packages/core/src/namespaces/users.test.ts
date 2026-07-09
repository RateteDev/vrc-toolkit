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
