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

// Like paginateAll, but for endpoints whose `offset` support is unverified
// against the real API (prints, inventory). Blindly paginating an endpoint
// that ignores `offset` would loop forever over identical full pages; this
// variant tracks item ids and stops as soon as a page contributes no unseen
// id — an ignored `offset` thus costs one extra request instead of a hang.
// Already-seen items are dropped, so a repeated page adds nothing. A page
// carrying no ids at all gives no way to detect repetition, so it is taken
// once and paging stops there.
export async function paginateAllGuarded<T>(
  pageSize: number,
  fetchPage: (offset: number) => Promise<T[]>,
  idOf: (item: T) => string | undefined,
): Promise<T[]> {
  const out: T[] = [];
  const seen = new Set<string>();
  let offset = 0;
  for (;;) {
    const page = await fetchPage(offset);
    const ids = page.map(idOf).filter((id): id is string => id !== undefined);
    if (ids.length === 0) {
      out.push(...page);
      return out;
    }
    const fresh = page.filter((item) => {
      const id = idOf(item);
      return id === undefined || !seen.has(id);
    });
    const advanced = fresh.some((item) => idOf(item) !== undefined);
    if (!advanced) return out;
    for (const id of ids) seen.add(id);
    out.push(...fresh);
    if (page.length < pageSize) return out;
    offset += pageSize;
  }
}
