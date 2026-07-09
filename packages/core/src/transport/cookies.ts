// Minimal cookie jar for the credential-login transport. A server-side `fetch`
// has no jar, so we capture Set-Cookie from each response and replay them on
// subsequent requests.

export type Jar = Record<string, string>;

export function getSetCookies(res: Response): string[] {
  // bun-types' Headers declares getSetCookie() natively (via the undici-types
  // fallback when the DOM lib is absent), so no type coercion is needed here.
  return res.headers.getSetCookie();
}

export function collectCookies(setCookies: string[], jar: Jar): void {
  for (const sc of setCookies) {
    const pair = sc.split(";")[0] ?? "";
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    jar[name] = value;
  }
}

export function cookieHeader(jar: Jar): string {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}
