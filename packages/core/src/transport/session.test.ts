import { afterEach, describe, expect, test } from "bun:test";
import { VrcError } from "../response";
import { sessionTransport } from "./session";

const realFetch = globalThis.fetch;

interface FetchCall {
  url: string;
  init: RequestInit | undefined;
}

// Replace global fetch with a recorder; return the captured calls.
function captureFetch(): FetchCall[] {
  const calls: FetchCall[] = [];
  globalThis.fetch = ((url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(new Response("{}", { status: 200 }));
  }) as typeof fetch;
  return calls;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("sessionTransport", () => {
  test("prepends the vrchat.com base and forces credentials: include", async () => {
    const calls = captureFetch();
    await sessionTransport().fetch("/auth/user");
    expect(calls[0]?.url).toBe("https://vrchat.com/api/1/auth/user");
    expect(calls[0]?.init?.credentials).toBe("include");
  });

  test("preserves method, headers, and body from the caller's init", async () => {
    const calls = captureFetch();
    await sessionTransport().fetch("/userNotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: "hi" }),
    });
    expect(calls[0]?.init?.method).toBe("POST");
    expect(new Headers(calls[0]?.init?.headers).get("Content-Type")).toBe("application/json");
    expect(calls[0]?.init?.body).toBe(JSON.stringify({ note: "hi" }));
    expect(calls[0]?.init?.credentials).toBe("include");
  });

  test("applies a base URL override", async () => {
    const calls = captureFetch();
    await sessionTransport({ baseUrl: "http://localhost:8787/api/1" }).fetch("/friends");
    expect(calls[0]?.url).toBe("http://localhost:8787/api/1/friends");
  });

  test("converts an upstream timeout into a 504 VrcError", async () => {
    globalThis.fetch = ((_url: string, _init?: RequestInit) =>
      Promise.reject(new DOMException("The operation timed out.", "TimeoutError"))) as typeof fetch;
    const err = (await sessionTransport()
      .fetch("/auth/user")
      .catch((e) => e)) as VrcError;
    expect(err).toBeInstanceOf(VrcError);
    expect(err.status).toBe(504);
  });
});
