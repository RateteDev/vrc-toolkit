import { afterEach, describe, expect, test } from "bun:test";
import { VrcError } from "../response";
import { credentialsTransport } from "./credentials";

const realFetch = globalThis.fetch;

interface FetchCall {
  url: string;
  init: RequestInit | undefined;
}

const CREDS = {
  username: "user@example.com",
  password: "p@ss w/rd",
  totpSecret: "GEZDGNBVGY3TQOJQ",
};
const UA = "vrc-toolkit-test/1.0 (contact@example.com)";
const BASE = "http://localhost:9999/api/1";

// Read a header off a recorded call, normalizing plain-object and Headers inits.
function header(call: FetchCall | undefined, name: string): string | null {
  return new Headers(call?.init?.headers).get(name);
}

function jsonResponse(body: unknown, status: number, setCookies: string[] = []): Response {
  const headers = new Headers();
  for (const sc of setCookies) headers.append("Set-Cookie", sc);
  return new Response(JSON.stringify(body), { status, headers });
}

// Install a fetch stub that answers by URL suffix; returns the captured calls.
function stubFetch(handler: (url: string) => Response): FetchCall[] {
  const calls: FetchCall[] = [];
  globalThis.fetch = ((url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(handler(url));
  }) as typeof fetch;
  return calls;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("credentialsTransport", () => {
  test("sends Basic auth to /auth/user, verifies TOTP, and replays collected cookies", async () => {
    const calls = stubFetch((url) => {
      if (url.endsWith("/auth/user")) {
        return jsonResponse({ requiresTwoFactorAuth: ["totp"] }, 200, ["auth=abc123; Path=/"]);
      }
      if (url.endsWith("/auth/twofactorauth/totp/verify")) {
        return jsonResponse({ verified: true }, 200, ["twoFactorAuth=xyz789; Path=/"]);
      }
      return jsonResponse({ ok: true }, 200);
    });

    const transport = await credentialsTransport(CREDS, { userAgent: UA, baseUrl: BASE });

    // Login step: Basic auth header decodes to the url-encoded credentials.
    const loginCall = calls.find((c) => c.url.endsWith("/auth/user"));
    expect(loginCall?.url).toBe(`${BASE}/auth/user`);
    const authHeader = header(loginCall, "Authorization") ?? "";
    expect(authHeader.startsWith("Basic ")).toBe(true);
    expect(atob(authHeader.slice("Basic ".length))).toBe(
      `${encodeURIComponent(CREDS.username)}:${encodeURIComponent(CREDS.password)}`,
    );
    expect(header(loginCall, "User-Agent")).toBe(UA);

    // TOTP verify step: POST with a 6-digit code and the first cookie replayed.
    const verifyCall = calls.find((c) => c.url.endsWith("/totp/verify"));
    expect(verifyCall?.init?.method).toBe("POST");
    expect(JSON.parse(verifyCall?.init?.body as string).code).toMatch(/^\d{6}$/);
    expect(header(verifyCall, "Cookie")).toBe("auth=abc123");

    // Post-login request replays both collected cookies and the User-Agent.
    await transport.fetch("/auth/user");
    const apiCall = calls[calls.length - 1];
    expect(header(apiCall, "Cookie")).toBe("auth=abc123; twoFactorAuth=xyz789");
    expect(header(apiCall, "User-Agent")).toBe(UA);
  });

  test("skips 2FA when the login response requires none", async () => {
    const calls = stubFetch(() => jsonResponse({ id: "usr_1" }, 200, ["auth=abc; Path=/"]));
    const transport = await credentialsTransport(CREDS, { userAgent: UA, baseUrl: BASE });
    expect(calls.some((c) => c.url.endsWith("/totp/verify"))).toBe(false);
    await transport.fetch("/friends");
    expect(header(calls[calls.length - 1], "Cookie")).toBe("auth=abc");
  });

  test("throws VrcError when the login request fails", async () => {
    stubFetch(() => jsonResponse({ error: { message: "invalid" } }, 401));
    await expect(
      credentialsTransport(CREDS, { userAgent: UA, baseUrl: BASE }),
    ).rejects.toBeInstanceOf(VrcError);
  });

  test("throws VrcError when TOTP verification is not confirmed", async () => {
    stubFetch((url) => {
      if (url.endsWith("/auth/user")) {
        return jsonResponse({ requiresTwoFactorAuth: ["totp"] }, 200, ["auth=abc; Path=/"]);
      }
      return jsonResponse({ verified: false }, 200);
    });
    await expect(
      credentialsTransport(CREDS, { userAgent: UA, baseUrl: BASE }),
    ).rejects.toBeInstanceOf(VrcError);
  });

  test("throws VrcError on an unsupported 2FA method", async () => {
    stubFetch(() =>
      jsonResponse({ requiresTwoFactorAuth: ["emailOtp"] }, 200, ["auth=abc; Path=/"]),
    );
    await expect(
      credentialsTransport(CREDS, { userAgent: UA, baseUrl: BASE }),
    ).rejects.toBeInstanceOf(VrcError);
  });
});
