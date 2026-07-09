// Single source of truth for the VRChat file-id contract and the same-origin
// /api/file/{fileId}/{version} proxy path scheme.

// VRChat file ids look like `file_<hex-with-dashes>`; versions are numeric.
const FILE_ID = "file_[0-9a-fA-F-]+";

// Parse an inbound proxy path -> { fileId, version } | null.
const PROXY_PATH = new RegExp(`^/api/file/(${FILE_ID})/(\\d+)$`);
export function parseProxyPath(pathname: string): { fileId: string; version: string } | null {
  const m = pathname.match(PROXY_PATH);
  if (!m) return null;
  // The two capture groups always match when the anchored regex matches.
  const [, fileId, version] = m;
  return { fileId: fileId ?? "", version: version ?? "" };
}

// Rewrite a raw VRChat file URL -> same-origin proxy path, or null if it doesn't match.
const VRCHAT_FILE_URL = new RegExp(`/file/(${FILE_ID})/(\\d+)/file`);
export function toProxyImage(rawUrl: string | null): string | null {
  if (!rawUrl) return null;
  const m = rawUrl.match(VRCHAT_FILE_URL);
  return m ? `/api/file/${m[1]}/${m[2]}` : null;
}

// Prefer the same-origin proxy path for VRChat file-hosted thumbnails. When the
// URL doesn't match the /file/ proxy contract, fall back to the raw https URL
// (CDN-hosted thumbnails are publicly accessible without auth).
export function resolveThumbUrl(thumb: string | null): string | null {
  const proxied = toProxyImage(thumb);
  if (proxied) return proxied;
  if (thumb?.startsWith("https://")) return thumb;
  return null;
}
