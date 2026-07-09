// Inventory namespace: list the account owner's owned inventory items.

import { VrcResource } from "../resource";

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

// Spec No.25 lists inventory with n=100.
const PAGE_SIZE = 100;

export class InventoryResource extends VrcResource {
  // GET /inventory?types=...&n&offset. Returns the raw response envelope. `types`
  // is passed through verbatim (e.g. "sticker" | "emoji"); type validation is a
  // domain concern, not done here. Single request.
  list(types: string, params: InventoryListParams = {}): Promise<RawInventoryResponse | null> {
    const n = params.n ?? PAGE_SIZE;
    const offset = params.offset ?? 0;
    return this.request<RawInventoryResponse>(
      `/inventory?types=${encodeURIComponent(types)}&n=${n}&offset=${offset}`,
    );
  }
}
