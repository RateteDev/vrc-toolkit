// Prints namespace: list, upload, and delete VRChat Prints.

import { VrcResource } from "../resource";
import type { PrintUploadResponse, VRChatPrint } from "../types";
import { buildQuery, PAGE_SIZE, paginateAllGuarded } from "./_shared";

export interface PrintUploadInput {
  image: Blob;
  filename: string;
  timestamp?: string;
  note?: string;
  worldId?: string;
  worldName?: string;
}

export interface PrintsListParams {
  n?: number;
  offset?: number;
}

export class PrintsResource extends VrcResource {
  // GET /prints/user/{userId} — a user's prints (raw). n/offset are omitted
  // when unspecified so the API's own defaults apply. Single request.
  list(userId: string, params: PrintsListParams = {}): Promise<VRChatPrint[]> {
    const query = buildQuery({ n: params.n, offset: params.offset });
    return this.requestArray<VRChatPrint>(`/prints/user/${encodeURIComponent(userId)}${query}`);
  }

  // Page GET /prints/user/{userId} to exhaustion (n=100). Whether this
  // endpoint honors `offset` is unverified against the real API, so the
  // guarded paginator is used: if `offset` turns out to be ignored, paging
  // stops after one repeated page instead of looping forever.
  listAll(userId: string): Promise<VRChatPrint[]> {
    return paginateAllGuarded(
      PAGE_SIZE,
      (offset) => this.list(userId, { n: PAGE_SIZE, offset }),
      (p) => p.id,
    );
  }

  // POST /prints (multipart/form-data). Uploads an arbitrary image as a Print,
  // bypassing the in-game camera. `timestamp` defaults to now truncated to
  // .000Z (the ms precision VRChat expects). Returns the raw upload response.
  upload(input: PrintUploadInput): Promise<PrintUploadResponse | null> {
    const form = new FormData();
    form.append("image", input.image, input.filename);
    form.append(
      "timestamp",
      input.timestamp ?? new Date().toISOString().replace(/\.\d+Z$/, ".000Z"),
    );
    if (input.note) form.append("note", input.note);
    if (input.worldId) form.append("worldId", input.worldId);
    if (input.worldName) form.append("worldName", input.worldName);
    return this.request<PrintUploadResponse>("/prints", { method: "POST", body: form });
  }

  // DELETE /prints/{id}.
  async delete(id: string): Promise<void> {
    await this.request(`/prints/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
}
