// Instance access-type + region derivation from a raw location string. Pure:
// the API returns the same tags in `GET /instances/{location}` (as `type` /
// `region`), but the UI also needs this before that request resolves (or when
// it never will, e.g. an offline card), so it is derivable from `location`
// alone rather than requiring the network round trip.

import { parseLocation } from "./friends";

export type InstanceAccessKind =
  | "public"
  | "friends-plus"
  | "friends"
  | "invite"
  | "invite-plus"
  | "group-public"
  | "group-plus"
  | "group";

export interface InstanceAccess {
  kind: InstanceAccessKind;
  // UI-facing label (English, matches VRChat's own instance-type wording).
  label: string;
  // Raw region token from the '~region(...)' tag, defaulted to 'us' when absent
  // (VRChat's own client treats a missing region tag as US).
  region: string;
  // Display label for `region`; falls back to the raw token for unknown codes.
  regionLabel: string;
}

const ACCESS_LABELS: Record<InstanceAccessKind, string> = {
  public: "Public",
  "friends-plus": "Friends+",
  friends: "Friends",
  invite: "Invite",
  "invite-plus": "Invite+",
  "group-public": "Group Public",
  "group-plus": "Group+",
  group: "Group",
};

const REGION_LABELS: Record<string, string> = {
  us: "US",
  use: "US East",
  eu: "EU",
  jp: "JP",
};

// Derive access type + region from a location string. Returns null when the
// location does not parse to an 'instance' kind (offline/private/traveling
// sentinels, or an empty/unrecognized string) since there is no instance to
// describe.
export function parseInstanceAccess(location: string | null | undefined): InstanceAccess | null {
  const parsed = parseLocation(location);
  if (parsed.kind !== "instance" || !parsed.instanceId) return null;

  let kind: InstanceAccessKind = "public";
  let canRequestInvite = false;
  let groupAccessType: string | null = null;
  let region = "us";

  for (const tag of parsed.instanceId.split("~")) {
    const open = tag.indexOf("(");
    const name = open < 0 ? tag : tag.slice(0, open);
    const value = open < 0 ? "" : tag.slice(open + 1).replace(")", "");
    switch (name) {
      case "hidden":
        kind = "friends-plus";
        break;
      case "friends":
        kind = "friends";
        break;
      case "private":
        kind = "invite";
        break;
      case "group":
        kind = "group";
        break;
      case "canRequestInvite":
        canRequestInvite = true;
        break;
      case "groupAccessType":
        groupAccessType = value;
        break;
      case "region":
        region = value;
        break;
      default:
        break;
    }
  }

  if (kind === "invite" && canRequestInvite) kind = "invite-plus";
  if (kind === "group") {
    if (groupAccessType === "public") kind = "group-public";
    else if (groupAccessType === "plus") kind = "group-plus";
  }

  return {
    kind,
    label: ACCESS_LABELS[kind],
    region,
    regionLabel: REGION_LABELS[region] ?? region,
  };
}
