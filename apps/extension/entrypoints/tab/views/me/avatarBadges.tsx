import { Icon } from "../../components/Icon";

// Known statuses render as an icon badge; unknown values fall back to the
// plain text badge so new VRChat statuses stay visible. Shared by owned and
// favorite avatar cards (AvatarsGrid, FavoriteAvatarCards).
const REL_ICONS: Record<string, string> = { public: "world", private: "lock", hidden: "eye-off" };

export function ReleaseBadge({ releaseStatus }: { releaseStatus: string }) {
  if (!releaseStatus) return null;
  const icon = REL_ICONS[releaseStatus];
  if (!icon) return <span className="arel">{releaseStatus}</span>;
  return (
    <span
      className={`arel arel--icon ${releaseStatus}`}
      role="img"
      aria-label={releaseStatus}
      title={releaseStatus}
    >
      <Icon name={icon} size={13} />
    </span>
  );
}

// Marks the currently worn avatar (client.auth.currentUser().currentAvatar).
// Placed opposite ReleaseBadge (top-left of the thumbnail vs. bottom-right) so
// the two never collide.
export function WornBadge() {
  return (
    <span className="aworn" role="img" aria-label="着用中" title="着用中">
      <Icon name="check" size={12} />
    </span>
  );
}
