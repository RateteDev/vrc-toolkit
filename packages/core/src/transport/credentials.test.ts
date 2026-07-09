import { afterEach, describe, expect, test } from "bun:test";
import { VrcError } from "../response";
import { type CredentialsTransportOptions, credentialsTransport } from "./credentials";

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

  test("rejects a missing or empty userAgent at construction", async () => {
    await expect(credentialsTransport(CREDS, { userAgent: "", baseUrl: BASE })).rejects.toThrow(
      /userAgent/,
    );
    const optionsWithoutUserAgent = { baseUrl: BASE } as CredentialsTransportOptions;
    await expect(credentialsTransport(CREDS, optionsWithoutUserAgent)).rejects.toThrow(/userAgent/);
  });

  test("preserves the raw response text in VrcError.body on a non-JSON login failure", async () => {
    stubFetch(() => new Response("<html>502 Bad Gateway</html>", { status: 502 }));
    const err = (await credentialsTransport(CREDS, { userAgent: UA, baseUrl: BASE }).catch(
      (e) => e,
    )) as VrcError;
    expect(err).toBeInstanceOf(VrcError);
    expect(err.body).toBe("<html>502 Bad Gateway</html>");
  });

  test("converts an upstream timeout into a 504 VrcError", async () => {
    globalThis.fetch = ((_url: string, _init?: RequestInit) =>
      Promise.reject(new DOMException("The operation timed out.", "TimeoutError"))) as typeof fetch;
    const err = (await credentialsTransport(CREDS, { userAgent: UA, baseUrl: BASE }).catch(
      (e) => e,
    )) as VrcError;
    expect(err).toBeInstanceOf(VrcError);
    expect(err.status).toBe(504);
  });

  test("exportCookies returns cookies collected from login and subsequent responses", async () => {
    stubFetch((url) => {
      if (url.endsWith("/auth/user")) {
        return jsonResponse({ requiresTwoFactorAuth: ["totp"] }, 200, ["auth=abc123; Path=/"]);
      }
      if (url.endsWith("/totp/verify")) {
        return jsonResponse({ verified: true }, 200, ["twoFactorAuth=xyz789; Path=/"]);
      }
      return jsonResponse([], 200, ["session=zzz999; Path=/"]);
    });
    const transport = await credentialsTransport(CREDS, { userAgent: UA, baseUrl: BASE });
    // Cookies from the Basic-auth and TOTP-verify legs of login are both present.
    expect(transport.exportCookies()).toEqual({ auth: "abc123", twoFactorAuth: "xyz789" });

    await transport.fetch("/friends");
    // A Set-Cookie on a post-login response is folded in too.
    expect(transport.exportCookies()).toEqual({
      auth: "abc123",
      twoFactorAuth: "xyz789",
      session: "zzz999",
    });
  });

  describe("seeded cookies", () => {
    test("skips the login handshake and replays the seeded jar", async () => {
      const calls = stubFetch(() => jsonResponse({ ok: true }, 200));
      const transport = await credentialsTransport(CREDS, {
        userAgent: UA,
        baseUrl: BASE,
        cookies: { auth: "seeded123" },
      });
      expect(calls).toHaveLength(0);

      await transport.fetch("/auth/user");
      expect(calls).toHaveLength(1);
      expect(header(calls[0], "Cookie")).toBe("auth=seeded123");
    });

    test("exportCookies reflects the seeded jar plus any rotation from subsequent requests", async () => {
      stubFetch(() => jsonResponse({ ok: true }, 200, ["auth=rotated; Path=/"]));
      const transport = await credentialsTransport(CREDS, {
        userAgent: UA,
        baseUrl: BASE,
        cookies: { auth: "seeded123" },
      });
      expect(transport.exportCookies()).toEqual({ auth: "seeded123" });

      await transport.fetch("/auth/user");
      expect(transport.exportCookies()).toEqual({ auth: "rotated" });
    });
  });
});
