// Inventory namespace: list the account owner's owned inventory items.

import { VrcResource } from "../resource";
import { buildQuery, PAGE_SIZE, paginateAllGuarded } from "./_shared";

// Raw /inventory data[] element. Field names are not fully confirmed against
// the live API (open question), so it is tolerant of extra/missing fields.
export interface RawInventoryItem {
  id?: string;
  itemType?: string;
  name?: string;
  created_at?: string;
  createdAt?: string;
  imageUrl?: string | null;
  [key: string]: unknown;
}

// Raw GET /inventory response envelope: `data` carries the items, `totalCount`
// is best-effort (field name unconfirmed).
export interface RawInventoryResponse {
  data?: RawInventoryItem[];
  totalCount?: number;
}

export interface InventoryListParams {
  n?: number;
  offset?: number;
}

export class InventoryResource extends VrcResource {
  // GET /inventory?types=...&n&offset. Returns the raw response envelope. `types`
  // is passed through verbatim (e.g. "sticker" | "emoji"); type validation is a
  // domain concern, not done here. n/offset are omitted when unspecified so the
  // API's own defaults apply. Single request.
  list(types: string, params: InventoryListParams = {}): Promise<RawInventoryResponse | null> {
    const query = buildQuery({ types, n: params.n, offset: params.offset });
    return this.request<RawInventoryResponse>(`/inventory${query}`);
  }

  // Page GET /inventory to exhaustion (n=100) and flatten the envelopes'
  // `data` into one item list. The API's own cap and its `offset` semantics
  // are unconfirmed, so the guarded paginator is used: if `offset` turns out
  // to be ignored, paging stops after one repeated page instead of looping
  // forever.
  listAll(types: string): Promise<RawInventoryItem[]> {
    return paginateAllGuarded(
      PAGE_SIZE,
      async (offset) => (await this.list(types, { n: PAGE_SIZE, offset }))?.data ?? [],
      (item) => item.id,
    );
  }
}
