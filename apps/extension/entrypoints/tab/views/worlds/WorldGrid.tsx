import type { WorldSummary } from "@vrc-toolkit/core/domain";
import { cssUrl } from "../cssUrl";

// The thumbnail-forward card grid shared by every worlds-tab section: plain
// heading sections (WorldGrid below) and collapsible favorite-group sections
// (FavoriteGroupSection) alike. Reuses the avatar grid's .agrid/.acard
// classes so all these grids read as one system.
export function WorldCards({
  worlds,
  emptyMessage,
  onOpen,
}: {
  worlds: WorldSummary[];
  emptyMessage: string;
  onOpen: (world: WorldSummary) => void;
}) {
  if (worlds.length === 0) {
    return <p className="mstatus">{emptyMessage}</p>;
  }
  return (
    <div className="agrid">
      {worlds.map((world) => (
        <button type="button" className="acard wcard" key={world.id} onClick={() => onOpen(world)}>
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
  );
}

// One labeled, always-expanded section of the worlds tab (最近訪れたワールド):
// a count-bearing heading followed by WorldCards.
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
      <WorldCards worlds={worlds} emptyMessage={emptyMessage} onOpen={onOpen} />
    </section>
  );
}
