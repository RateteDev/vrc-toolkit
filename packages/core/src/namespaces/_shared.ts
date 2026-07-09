// Internal helpers shared across namespaces. Kept inside the namespaces layer
// (not domain) so the API surface stays self-contained: namespaces build query
// strings and exhaust pages without depending on the consumer-facing domain
// helpers.

// VRChat caps `n` at 100 across list endpoints; listAll pages with this size.
export const PAGE_SIZE = 100;

// Build a query string: skip undefined values, URL-encode each key/value, and
// prefix "?" only when non-empty. Enumeration order follows the object.
export function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

// Drive offset/n paging to exhaustion: fetch pages until one returns fewer than
// `pageSize` items (the partial final page, including an empty first page).
export async function paginateAll<T>(
  pageSize: number,
  fetchPage: (offset: number) => Promise<T[]>,
): Promise<T[]> {
  const out: T[] = [];
  let offset = 0;
  for (;;) {
    const page = await fetchPage(offset);
    out.push(...page);
    if (page.length < pageSize) return out;
    offset += pageSize;
  }
}
