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
import { generateTotp } from "./totp";
import type { VrcTransport } from "./types";

// Canonical base for the credential-login path. This is the direct API host, not
// vrchat.com (that is the browser session-reuse path). Overridable for tests.
const CREDENTIALS_API_BASE = "https://api.vrchat.cloud/api/1";

// Upstream request timeout. Guards against hanging on a stalled VRChat
// connection; a timeout surfaces as a typed 504 VrcError instead of a raw
// AbortError, so callers get a clean, typed failure.
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
}

// fetch with an upstream timeout; a timeout becomes a 504 VrcError instead of a
// raw AbortError, so callers get a clean, typed failure.
async function fetchVRC(url: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new VrcError("upstream VRChat request timed out", 504, "");
    }
    throw err;
  }
}

// Parse a JSON body as T; non-JSON yields an empty object (callers use optional
// access). Used for the auth handshake, whose bodies we inspect before the
// namespace-level parseVrcResponse is in play.
async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
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
  const loginBody = await readJson<AuthUserResponse>(loginRes);
  if (loginRes.status !== 200) {
    throw new VrcError("login failed", loginRes.status, JSON.stringify(loginBody));
  }

  const req2fa: string[] = loginBody?.requiresTwoFactorAuth ?? [];
  if (req2fa.length === 0) return;

  // 2FA required. We only implement TOTP (also advertised as "otp"); any other
  // method (e.g. emailOtp) is unsupported and fails loudly rather than silently
  // returning an unauthenticated session.
  if (!req2fa.includes("totp") && !req2fa.includes("otp")) {
    throw new VrcError(
      `unsupported 2FA method: ${req2fa.join(",")}`,
      loginRes.status,
      JSON.stringify(loginBody),
    );
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
  const verify = await readJson<TwoFactorVerifyResponse>(verifyRes);
  if (verify?.verified !== true) {
    throw new VrcError("TOTP verification failed", verifyRes.status, JSON.stringify(verify));
  }
}

// Build a credential-login transport. Authenticates eagerly (awaited here) and
// then holds the cookie jar in memory, injecting Cookie + User-Agent and
// re-collecting rotated Set-Cookie on every subsequent request.
export async function credentialsTransport(
  creds: VRChatCredentials,
  options: CredentialsTransportOptions,
): Promise<VrcTransport> {
  const baseUrl = options.baseUrl ?? CREDENTIALS_API_BASE;
  const userAgent = options.userAgent;
  const jar: Jar = {};
  await login(creds, userAgent, baseUrl, jar);

  return {
    async fetch(path, init = {}) {
      const headers = new Headers(init.headers);
      headers.set("User-Agent", userAgent);
      headers.set("Cookie", cookieHeader(jar));
      const res = await fetchVRC(`${baseUrl}${path}`, { ...init, headers });
      collectCookies(getSetCookies(res), jar);
      return res;
    },
  };
}
