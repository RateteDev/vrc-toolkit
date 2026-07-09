import { describe, expect, test } from "bun:test";
import { VrcResource } from "./resource";
import { VrcError } from "./response";
import type { VrcTransport } from "./transport/types";

// A transport that replays a scripted Response and records the request.
function stubTransport(res: Response): { transport: VrcTransport; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    transport: {
      fetch(path, init) {
        calls.push(`${init?.method ?? "GET"} ${path}`);
        return Promise.resolve(res);
      },
    },
  };
}

// Concrete resource exposing the protected helpers for testing.
class Probe extends VrcResource {
  get<T>(path: string) {
    return this.request<T>(path);
  }
  getArray<T>(path: string) {
    return this.requestArray<T>(path);
  }
}

describe("VrcResource", () => {
  test("request parses the transport response as T", async () => {
    const { transport, calls } = stubTransport(new Response('{"id":"usr_1"}', { status: 200 }));
    expect(await new Probe(transport).get<{ id: string }>("/auth/user")).toEqual({ id: "usr_1" });
    expect(calls).toEqual(["GET /auth/user"]);
  });

  test("requestArray normalizes a non-array body to []", async () => {
    const { transport } = stubTransport(new Response("null", { status: 200 }));
    expect(await new Probe(transport).getArray("/friends")).toEqual([]);
  });

  test("requestArray passes a real array body through unchanged", async () => {
    const { transport } = stubTransport(
      new Response('[{"id":"usr_1"},{"id":"usr_2"}]', { status: 200 }),
    );
    expect(await new Probe(transport).getArray<{ id: string }>("/friends")).toEqual([
      { id: "usr_1" },
      { id: "usr_2" },
    ]);
  });

  test("request surfaces upstream failures as VrcError with a derived message", async () => {
    const { transport } = stubTransport(new Response("{}", { status: 500 }));
    const err = (await new Probe(transport).get("/auth/user").catch((e) => e)) as VrcError;
    expect(err).toBeInstanceOf(VrcError);
    expect(err.message).toBe("GET /auth/user failed");
  });
});
