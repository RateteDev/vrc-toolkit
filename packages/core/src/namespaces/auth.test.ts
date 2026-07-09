import { describe, expect, test } from "bun:test";
import { VrcError } from "../response";
import { recorder, replyJson } from "./_testutil";
import { AuthResource } from "./auth";

describe("AuthResource.currentUser", () => {
  test("GET /auth/user, returns the raw body", async () => {
    const { transport, calls } = recorder(replyJson({ id: "usr_1", displayName: "Me" }));
    const me = await new AuthResource(transport).currentUser();
    expect(calls[0]?.path).toBe("/auth/user");
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");
    expect(me).toEqual({ id: "usr_1", displayName: "Me" });
  });

  test("returns null on 401 (unauthenticated)", async () => {
    const { transport } = recorder(replyJson({ error: { message: "unauth" } }, 401));
    expect(await new AuthResource(transport).currentUser()).toBeNull();
  });

  test("rethrows non-401 failures as VrcError", async () => {
    const { transport } = recorder(replyJson({}, 500));
    const err = await new AuthResource(transport).currentUser().catch((e) => e);
    expect(err).toBeInstanceOf(VrcError);
    expect((err as VrcError).status).toBe(500);
  });
});
