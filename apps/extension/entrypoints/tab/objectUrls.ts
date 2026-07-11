// Unmount-time safety net for URL.createObjectURL previews, shared by the
// upload modals (prints batch / avatar image). Both revoke their object URLs
// on every explicit path (remove, reselect, close, successful submit); this
// hook covers the remaining one — the parent unmounting the modal without
// going through those paths — so a staged image's memory never outlives the
// component. Revoking an already-revoked URL is a no-op, so overlapping with
// the explicit paths is harmless.

import { useEffect, useRef } from "react";

export function useObjectUrlCleanup(liveUrls: () => string[]): void {
  const ref = useRef(liveUrls);
  ref.current = liveUrls;
  // Unmount only. Safe under StrictMode's simulated mount/unmount cycle
  // because no object URL exists yet at mount time (modals open empty).
  useEffect(
    () => () => {
      for (const u of ref.current()) URL.revokeObjectURL(u);
    },
    [],
  );
}
