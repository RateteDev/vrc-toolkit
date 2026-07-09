// Presence status validation (spec No.5).

// Valid VRChat presence status enum. The two-word values carry literal spaces.
export const VRC_STATUSES = ["active", "ask me", "busy", "join me", "offline"] as const;
export type VrcStatus = (typeof VRC_STATUSES)[number];

export interface StatusUpdate {
  status: VrcStatus;
  statusDescription: string;
}

// Normalize/validate a manual status-switch input into a StatusUpdate. Accepts
// only the five literal enum strings (rejects 'askMe'/'join_me'/garbage). The
// statusDescription has no spec-defined max length, so it is passed through
// unmodified (no length validation, no trimming).
export function validateStatus(input: { status: string; statusDescription: string }): StatusUpdate {
  if (!(VRC_STATUSES as readonly string[]).includes(input.status)) {
    throw new Error(`invalid status: ${input.status}`);
  }
  return {
    status: input.status as VrcStatus,
    statusDescription: input.statusDescription,
  };
}
