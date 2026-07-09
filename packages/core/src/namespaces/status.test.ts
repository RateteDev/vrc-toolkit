import { describe, expect, test } from "bun:test";
import { recorder, replyJson } from "./_testutil";
import { StatusResource } from "./status";

describe("StatusResource.update", () => {
  test("PUT /users/{userId} with the status body verbatim", async () => {
    const { transport, calls } = recorder(replyJson({}));
    await new StatusResource(transport).update("usr_1", {
      status: "join me",
      statusDescription: "come over",
    });
    expect(calls[0]?.path).toBe("/users/usr_1");
    expect(calls[0]?.init?.method).toBe("PUT");
    expect(new Headers(calls[0]?.init?.headers).get("content-type")).toBe("application/json");
    expect(calls[0]?.init?.body).toBe(
      JSON.stringify({ status: "join me", statusDescription: "come over" }),
    );
  });

  test("url-encodes the userId", async () => {
    const { transport, calls } = recorder(replyJson({}));
    await new StatusResource(transport).update("usr a/b", {
      status: "active",
      statusDescription: "",
    });
    expect(calls[0]?.path).toBe("/users/usr%20a%2Fb");
  });
});
