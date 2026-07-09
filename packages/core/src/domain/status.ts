// Presence status validation (spec No.5).

// Valid VRChat presence status enum. The two-word values carry literal spaces.
export type VrcStatus = "active" | "ask me" | "busy" | "join me" | "offline";

export interface StatusUpdate {
  status: VrcStatus;
  statusDescription: string;
}

// Normalize/validate a manual status-switch input into a StatusUpdate. Accepts
// only the five literal enum strings (rejects 'askMe'/'join_me'/garbage). The
// statusDescription has no spec-defined max length, so it is passed through
// unmodified (no length validation, no trimming).
export function validateStatus(input: { status: string; statusDescription: string }): StatusUpdate {
  const valid = ["active", "ask me", "busy", "join me", "offline"];
  if (valid.indexOf(input.status) < 0) {
    throw new Error(`invalid status: ${input.status}`);
  }
  return {
    status: input.status as VrcStatus,
    statusDescription: input.statusDescription,
  };
}
