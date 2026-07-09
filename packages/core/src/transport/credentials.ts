// Credential-login transport. Authenticates with username/password (Basic auth)
// plus TOTP 2FA against the unofficial VRChat API, holds the resulting session
// cookies in an in-memory jar, and replays Cookie + User-Agent on every request.
// This is the non-browser path (CLI/MCP); it targets api.vrchat.cloud directly.
//
// NOTE: unofficial, rate-limited, ToS-sensitive API. A contactable User-Agent is
// mandatory (see the unofficial-API policy) and is required from the caller.

import { VrcError } from "../response";
import type { AuthUserResponse, TwoFactorVerifyResponse } from "../types";
import { collectCookies, cookieHeader, getSetCookies, type Jar } from "./cookies";
import { fetchWithTimeout } from "./timeout";
import { generateTotp } from "./totp";
import type { VrcTransport } from "./types";

// Canonical base for the credential-login path. This is the direct API host, not
// vrchat.com (that is the browser session-reuse path). Overridable for tests.
const CREDENTIALS_API_BASE = "https://api.vrchat.cloud/api/1";

// Upstream request timeout guarding against a hung connection (see fetchWithTimeout).
const REQUEST_TIMEOUT_MS = 15000;

export interface VRChatCredentials {
  username: string;
  password: string;
  totpSecret: string;
}

export interface CredentialsTransportOptions {
  // Contactable User-Agent sent on every request. Required: no default, per the
  // unofficial-API policy.
  userAgent: string;
  // API base URL. Defaults to CREDENTIALS_API_BASE; overridable for tests.
  baseUrl?: string;
  // Seed the cookie jar with a previously exported session (see
  // CredentialsTransport.exportCookies), skipping the login handshake below.
  // Mirrors the old Worker client's `fromJar`: this layer does not validate
  // the seeded session — an expired one simply fails on the first request.
  // Detecting that and re-authenticating is the caller's responsibility (e.g.
  // a session cache one layer up), not this transport's.
  cookies?: Jar;
}

// A credential-login transport, extended with the ability to snapshot its
// cookie jar so a caller can persist it and skip the login handshake next time.
export interface CredentialsTransport extends VrcTransport {
  exportCookies(): Jar;
}

// fetch with the shared upstream timeout.
function fetchVRC(url: string, init: RequestInit = {}): Promise<Response> {
  return fetchWithTimeout(url, init, REQUEST_TIMEOUT_MS);
}

// Parse a JSON body as T; non-JSON yields an empty object (callers use optional
// access). Used for the auth handshake, whose bodies we inspect before the
// namespace-level parseVrcResponse is in play.
function parseJsonSafe<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

// Run the Basic-auth -> optional-TOTP login, filling the jar with session cookies.
async function login(
  creds: VRChatCredentials,
  userAgent: string,
  baseUrl: string,
  jar: Jar,
): Promise<void> {
  const basic = btoa(`${encodeURIComponent(creds.username)}:${encodeURIComponent(creds.password)}`);
  const loginRes = await fetchVRC(`${baseUrl}/auth/user`, {
    headers: { Authorization: `Basic ${basic}`, "User-Agent": userAgent },
  });
  collectCookies(getSetCookies(loginRes), jar);
  const loginText = await loginRes.text();
  if (loginRes.status !== 200) {
    throw new VrcError("login failed", loginRes.status, loginText);
  }
  const loginBody = parseJsonSafe<AuthUserResponse>(loginText);

  const req2fa: string[] = loginBody?.requiresTwoFactorAuth ?? [];
  if (req2fa.length === 0) return;

  // 2FA required. We only implement TOTP (also advertised as "otp"); any other
  // method (e.g. emailOtp) is unsupported and fails loudly rather than silently
  // returning an unauthenticated session.
  if (!req2fa.includes("totp") && !req2fa.includes("otp")) {
    throw new VrcError(`unsupported 2FA method: ${req2fa.join(",")}`, loginRes.status, loginText);
  }
  const code = await generateTotp(creds.totpSecret);
  const verifyRes = await fetchVRC(`${baseUrl}/auth/twofactorauth/totp/verify`, {
    method: "POST",
    headers: {
      "User-Agent": userAgent,
      "Content-Type": "application/json",
      Cookie: cookieHeader(jar),
    },
    body: JSON.stringify({ code }),
  });
  collectCookies(getSetCookies(verifyRes), jar);
  const verifyText = await verifyRes.text();
  const verify = parseJsonSafe<TwoFactorVerifyResponse>(verifyText);
  if (verify?.verified !== true) {
    throw new VrcError("TOTP verification failed", verifyRes.status, verifyText);
  }
}

// Build a credential-login transport. Authenticates eagerly (awaited here) and
// then holds the cookie jar in memory, injecting Cookie + User-Agent and
// re-collecting rotated Set-Cookie on every subsequent request. Skips the
// login handshake entirely when a seeded `cookies` jar is supplied.
export async function credentialsTransport(
  creds: VRChatCredentials,
  options: CredentialsTransportOptions,
): Promise<CredentialsTransport> {
  if (typeof options.userAgent !== "string" || options.userAgent.trim().length === 0) {
    throw new Error("credentialsTransport: userAgent must be a non-empty string");
  }
  const baseUrl = options.baseUrl ?? CREDENTIALS_API_BASE;
  const userAgent = options.userAgent;
  const jar: Jar = options.cookies ? { ...options.cookies } : {};
  if (!options.cookies) {
    await login(creds, userAgent, baseUrl, jar);
  }

  return {
    async fetch(path, init = {}) {
      const headers = new Headers(init.headers);
      headers.set("User-Agent", userAgent);
      headers.set("Cookie", cookieHeader(jar));
      const res = await fetchVRC(`${baseUrl}${path}`, { ...init, headers });
      collectCookies(getSetCookies(res), jar);
      return res;
    },
    exportCookies() {
      return { ...jar };
    },
  };
}
