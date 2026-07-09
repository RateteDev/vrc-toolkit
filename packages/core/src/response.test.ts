import { describe, expect, test } from "bun:test";
import { parseVrcResponse, VrcError } from "./response";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("parseVrcResponse", () => {
  test("returns the parsed body on 200", async () => {
    const res = jsonResponse({ id: "usr_1", displayName: "Ada" });
    expect(await parseVrcResponse<{ id: string; displayName: string }>(res, "failed")).toEqual({
      id: "usr_1",
      displayName: "Ada",
    });
  });

  test("returns null on a 200 with a non-JSON body", async () => {
    const res = new Response("not json", { status: 200 });
    expect(await parseVrcResponse(res, "failed")).toBeNull();
  });

  test("throws VrcError carrying the envelope error.message on non-200", async () => {
    const res = jsonResponse({ error: { message: "Missing Credentials" } }, 401);
    const err = (await parseVrcResponse(res, "auth/user failed").catch((e) => e)) as VrcError;
    expect(err).toBeInstanceOf(VrcError);
    expect(err.status).toBe(401);
    expect(err.message).toBe("Missing Credentials");
  });

  test("falls back to the given message when no error.message is present", async () => {
    const res = new Response("gateway blew up", { status: 502 });
    const err = (await parseVrcResponse(res, "prints/list failed").catch((e) => e)) as VrcError;
    expect(err.message).toBe("prints/list failed");
    expect(err.body).toBe("gateway blew up");
  });

  test("truncates the retained error body to 600 chars", async () => {
    const res = new Response("x".repeat(1000), { status: 500 });
    const err = (await parseVrcResponse(res, "failed").catch((e) => e)) as VrcError;
    expect(err.body).toHaveLength(600);
  });
});
