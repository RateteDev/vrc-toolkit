// Status namespace: switch the account owner's presence status.

import { VrcResource } from "../resource";

export interface StatusUpdateInput {
  status: string;
  statusDescription: string;
}

export class StatusResource extends VrcResource {
  // PUT /users/{userId} with { status, statusDescription }. The body is sent
  // verbatim: enum validation of `status` is a domain concern, not done here.
  // The caller supplies the target userId (usually auth.currentUser()'s id).
  update(userId: string, update: StatusUpdateInput): Promise<unknown> {
    return this.request<unknown>(`/users/${encodeURIComponent(userId)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(update),
    });
  }
}
