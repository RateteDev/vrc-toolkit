import { statusDotClass } from "../../status";
import { cssUrl } from "../cssUrl";
import type { Person } from "../friends/people";

// One world's joinable-friends group: a thumbnail on the left, name + member
// pills on the right. Each pill opens the shared CardModal for that user.
export function WorldCard({
  worldName,
  thumbnailUrl,
  members,
  onOpenMember,
}: {
  // Null while the world lookup is still unresolved.
  worldName: string | null;
  thumbnailUrl: string | null;
  members: Person[];
  onOpenMember: (userId: string) => void;
}) {
  return (
    <div className="jworld">
      <div
        className="jthumb"
        style={thumbnailUrl ? { backgroundImage: cssUrl(thumbnailUrl) } : undefined}
      />
      <div className="jbody">
        <div className="jhead">
          <span className="jname">{worldName ?? "読み込み中…"}</span>
          <span className="jcount">{members.length}</span>
        </div>
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
