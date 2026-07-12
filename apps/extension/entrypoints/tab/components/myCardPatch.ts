// Pure form -> users.update patch assembly + validation for MyCardModal's
// save button. Network-free so it can be unit-tested in isolation.

import type { UserProfilePatch } from "@vrc-toolkit/core";
import { validateBio, validateBioLinks } from "@vrc-toolkit/core/domain";

// The modal always renders exactly 3 link input slots; empty slots are
// dropped by validateBioLinks before the patch is sent.
export interface MyCardForm {
  bio: string;
  bioLinks: [string, string, string];
  pronouns: string;
}

// Build the users.update patch from the 3-slot form, or throw a
// (Japanese-message) validation error for the caller to surface. Only
// bio/bioLinks/pronouns are editable here — status/statusDescription stay in
// the header popover (see StatusPopover in HeaderStatus.tsx).
export function buildProfilePatch(form: MyCardForm): UserProfilePatch {
  return {
    bio: validateBio(form.bio),
    bioLinks: validateBioLinks(form.bioLinks),
    pronouns: form.pronouns.trim(),
  };
}
