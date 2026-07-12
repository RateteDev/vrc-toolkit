import { statusDotClass } from "../../status";
import { cssUrl } from "../cssUrl";
import type { Person } from "../friends/people";

// One world's joinable-friends group: a thumbnail on the left, name + member
// pills on the right. Each pill opens the shared CardModal for that user; the
// thumbnail and name open the WorldModal instead (two separate triggers so
// neither button ends up nested inside the other).
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
        <div className="jmembers">
          {members.map((p) => (
            <button
              key={p.userId}
              type="button"
              className="jchip"
              onClick={() => onOpenMember(p.userId)}
            >
              <span
                className="jchip-avatar"
                style={p.imageUrl ? { backgroundImage: cssUrl(p.imageUrl) } : undefined}
              >
                <span className={`fdot jchip-dot ${statusDotClass(p.status)}`} />
              </span>
              <span>{p.displayName || "（名前なし）"}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
