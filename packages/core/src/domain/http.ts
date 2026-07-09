// fetch + defensive json parse, normalized to {ok,status,d}. Uses only the
// global fetch; the network is the caller's concern.
export function fetchJson(
  url: string,
  opts?: RequestInit,
): Promise<{ ok: boolean; status: number; d: unknown }> {
  return fetch(url, opts).then((r) =>
    r
      .json()
      .catch(() => null)
      .then((d) => ({ ok: r.ok, status: r.status, d })),
  );
}
