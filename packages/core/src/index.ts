export const VRCHAT_API_BASE = "https://vrchat.com/api/1";

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${VRCHAT_API_BASE}${normalizedPath}`;
}
