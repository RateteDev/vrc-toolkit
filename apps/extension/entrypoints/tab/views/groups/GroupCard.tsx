import { type GroupInstanceView, type GroupSummary, hasUnreadPost } from "@vrc-toolkit/core/domain";
import { cssUrl } from "../cssUrl";

// One group in the card grid, reusing the avatar/world .acard visual system.
// Corner badges flag the representing group, unread posts, and an ongoing
// instance (with its live occupant total).
export function GroupCard({
  group,
  openInstances,
  onOpen,
}: {
  group: GroupSummary;
  openInstances: GroupInstanceView[];
  onOpen: () => void;
}) {
  const unread = hasUnreadPost(group);
  const liveUsers = openInstances.reduce((sum, inst) => sum + (inst.userCount ?? 0), 0);
  const isLive = openInstances.length > 0;

  return (
    <button type="button" className="acard gcard" onClick={onOpen}>
      <div
        className="athumb gthumb"
        style={group.iconUrl ? { backgroundImage: cssUrl(group.iconUrl) } : undefined}
      >
        <div className="gbadges">
          {group.isRepresenting ? <span className="gbadge gbadge--rep">代表</span> : null}
          {unread ? <span className="gbadge gbadge--unread">未読</span> : null}
          {isLive ? <span className="gbadge gbadge--live">開催中 {liveUsers}</span> : null}
        </div>
      </div>
      <div className="abody">
        <div className="aname">{group.name || "（名前なし）"}</div>
        {group.tag ? <div className="gtag">{group.tag}</div> : null}
        {group.memberCount !== null ? (
          <div className="ameta">
            <span className="adate">{group.memberCount}人</span>
          </div>
        ) : null}
      </div>
    </button>
  );
}
