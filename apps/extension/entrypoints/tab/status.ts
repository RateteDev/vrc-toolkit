// Presence status → CSS dot-class suffix, shared by the friend cards, the
// status popover, and the header widget. Keyed off VRChat's status string.
export function statusDotClass(status: string): string {
  switch (status) {
    case "join me":
      return "joinme";
    case "active":
      return "active";
    case "ask me":
      return "askme";
    case "busy":
      return "busy";
    default:
      return "offline";
  }
}
