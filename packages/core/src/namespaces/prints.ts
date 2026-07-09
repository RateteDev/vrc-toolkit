// Prints namespace: list, upload, and delete VRChat Prints.

import { VrcResource } from "../resource";
import type { PrintUploadResponse, VRChatPrint } from "../types";

export interface PrintUploadInput {
  image: Blob;
  filename: string;
  timestamp?: string;
  note?: string;
  worldId?: string;
  worldName?: string;
}

export class PrintsResource extends VrcResource {
  // GET /prints/user/{userId}?n=100 — a user's prints (raw). Single request.
  list(userId: string): Promise<VRChatPrint[]> {
    return this.requestArray<VRChatPrint>(`/prints/user/${encodeURIComponent(userId)}?n=100`);
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
