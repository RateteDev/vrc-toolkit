import type { WorldSummary } from "@vrc-toolkit/core/domain";
import { useState } from "react";
import { WorldCards } from "./WorldGrid";

// One favorite group as a native <details>/<summary> section, default closed.
// Native details/summary keeps keyboard/screen-reader toggle behavior for
// free. WorldCards is only rendered while open, so a group with a large
// favorite count doesn't force-load every thumbnail up front.
export function FavoriteGroupSection({
  displayName,
  worlds,
  onOpen,
}: {
  displayName: string;
  worlds: WorldSummary[];
  onOpen: (world: WorldSummary) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details className="wgroup" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="wgroup-summary">
        {displayName} ({worlds.length})
      </summary>
      {open ? (
        <WorldCards
          worlds={worlds}
          emptyMessage="このグループにお気に入りワールドはありません。"
          onOpen={onOpen}
        />
      ) : null}
    </details>
  );
}
