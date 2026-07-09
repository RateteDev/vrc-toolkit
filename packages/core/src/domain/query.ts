// Query-string construction helper. Pure: uses only encodeURIComponent.

// Build a query string from params: skip undefined values, encode each value,
// join with '&', and prefix '?' only when the result is non-empty. Stable order
// follows the object's own enumeration order.
export function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const parts: string[] = [];
  for (const k in params) {
    const v = params[k];
    if (v === undefined) continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}
