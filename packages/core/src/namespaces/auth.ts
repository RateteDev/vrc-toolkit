// Auth namespace: the authenticated session's own account.

import { VrcResource } from "../resource";
import { VrcError } from "../response";
import type { AuthUserResponse } from "../types";

export class AuthResource extends VrcResource {
  // GET /auth/user. Returns the raw authenticated-user object verbatim, or null
  // when the session is unauthenticated (401) — mirrors the Worker's 401 guard.
  // Other non-200 statuses still surface as a thrown VrcError.
  async currentUser(): Promise<AuthUserResponse | null> {
    try {
      return await this.request<AuthUserResponse>("/auth/user");
    } catch (err) {
      if (err instanceof VrcError && err.status === 401) return null;
      throw err;
    }
  }
}
