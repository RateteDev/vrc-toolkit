import { cssUrl } from "../cssUrl";
import type { Person } from "../friends/people";
import { InstanceRowCard } from "./InstanceRowCard";
import { groupMembersByInstance } from "./instances";

// One world's joinable-friends group: a thumbnail + name header (opens the
// WorldModal for world detail) above a per-instance row list. Each row carries
// its own access badge, region, occupancy, friend chips, and self-invite JOIN
// button, so the user can decide and join without opening the modal.
export function WorldCard({
  worldId,
  worldName,
  thumbnailUrl,
  members,
  onOpenMember,
  onOpenWorld,
}: {
  worldId: string;
  // Null while the world lookup is still unresolved.
  worldName: string | null;
  thumbnailUrl: string | null;
  members: Person[];
  onOpenMember: (userId: string) => void;
  onOpenWorld: (worldId: string) => void;
}) {
  const rows = groupMembersByInstance(members);
  return (
    <div className="jworld">
      <button
        type="button"
        className="jthumb"
        style={thumbnailUrl ? { backgroundImage: cssUrl(thumbnailUrl) } : undefined}
        onClick={() => onOpenWorld(worldId)}
        aria-label={`${worldName ?? "ワールド"}の詳細を開く`}
      />
      <div className="jbody">
        <button type="button" className="jhead" onClick={() => onOpenWorld(worldId)}>
          <span className="jname">{worldName ?? "読み込み中…"}</span>
          <span className="jcount">{members.length}</span>
        </button>
        <ul className="instrows">
          {rows.map((row) => (
            <InstanceRowCard key={row.location} row={row} onOpenMember={onOpenMember} />
          ))}
        </ul>
      </div>
    </div>
  );
}
