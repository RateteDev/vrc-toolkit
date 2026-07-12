import type { WorldSummary } from "@vrc-toolkit/core/domain";
import { cssUrl } from "../cssUrl";

// One labeled section of the worlds tab (お気に入り / 最近訪れたワールド):
// a count-bearing heading followed by a thumbnail-forward card grid, reusing
// the avatar grid's .agrid/.acard classes so both grids read as one system.
export function WorldGrid({
  title,
  worlds,
  emptyMessage,
  onOpen,
}: {
  title: string;
  worlds: WorldSummary[];
  emptyMessage: string;
  onOpen: (world: WorldSummary) => void;
}) {
  return (
    <section className="wsec">
      <h3 className="wsec-title">
        {title} ({worlds.length})
      </h3>
      {worlds.length === 0 ? (
        <p className="mstatus">{emptyMessage}</p>
      ) : (
        <div className="agrid">
          {worlds.map((world) => (
            <button
              type="button"
              className="acard wcard"
              key={world.id}
              onClick={() => onOpen(world)}
            >
              <div
                className="athumb"
                style={
                  world.thumbnailImageUrl
                    ? { backgroundImage: cssUrl(world.thumbnailImageUrl) }
                    : undefined
                }
              />
              <div className="abody">
                <div className="aname">{world.name || "（名前なし）"}</div>
                <div className="ameta">
                  {world.occupants !== null ? (
                    <span className="adate">
                      {world.occupants}
                      {world.capacity !== null ? ` / ${world.capacity}` : ""}人
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
