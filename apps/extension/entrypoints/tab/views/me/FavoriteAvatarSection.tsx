import type { FavoriteAvatarSummary } from "@vrc-toolkit/core/domain";
import { useState } from "react";
import { FavoriteAvatarCards } from "./FavoriteAvatarCards";

// One favorite-avatar-group section as a native <details>/<summary>, default
// closed. Mirrors views/worlds/FavoriteGroupSection: native details/summary
// keeps keyboard/screen-reader toggle behavior for free, and cards only
// render while open so a large favorite count doesn't force-load every
// thumbnail up front.
export function FavoriteAvatarSection({
  displayName,
  avatars,
  currentAvatarId,
  busyId,
  onSwitch,
}: {
  displayName: string;
  avatars: FavoriteAvatarSummary[];
  currentAvatarId: string | null;
  busyId: string | null;
  onSwitch: (avatar: FavoriteAvatarSummary) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details className="wgroup" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="wgroup-summary">
        {displayName} ({avatars.length})
      </summary>
      {open ? (
        <FavoriteAvatarCards
          avatars={avatars}
          currentAvatarId={currentAvatarId}
          busyId={busyId}
          onSwitch={onSwitch}
        />
      ) : null}
    </details>
  );
}
