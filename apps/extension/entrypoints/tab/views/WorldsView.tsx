import { fmtWorld, type WorldSummary } from "@vrc-toolkit/core/domain";
import { useCallback, useEffect, useState } from "react";
import { LastUpdated } from "../components/LastUpdated";
import { useVrc } from "../vrc";
import { errorMessage } from "./errorMessage";
import { WorldModal } from "./join/WorldModal";
import { WorldGrid } from "./worlds/WorldGrid";

// VRChat caps list endpoints at n=100; a single request per list (no paging),
// per the unofficial-API policy against high-frequency/bulk calls. Truncation
// beyond 100 favorites/recent worlds is visible via the count in the heading.
const LIST_LIMIT = 100;

// The account owner's favorite and recently-visited worlds. Fetched once on
// mount plus on manual 更新, matching AvatarsGrid's load model; no polling.
export function WorldsView() {
  const client = useVrc();
  const [favorites, setFavorites] = useState<WorldSummary[]>([]);
  const [recent, setRecent] = useState<WorldSummary[]>([]);
  const [message, setMessage] = useState("読み込み中…");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [openWorld, setOpenWorld] = useState<WorldSummary | null>(null);

  const load = useCallback(() => {
    setMessage("読み込み中…");
    Promise.all([client.worlds.favorites(LIST_LIMIT), client.worlds.recent(LIST_LIMIT)])
      .then(([favoriteWorlds, recentWorlds]) => {
        setFavorites(favoriteWorlds.map(fmtWorld));
        setRecent(recentWorlds.map(fmtWorld));
        setMessage("");
        setLastUpdate(new Date());
      })
      .catch((err: unknown) => setMessage(`ネットワークエラー: ${errorMessage(err)}`));
  }, [client]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section id="view-worlds">
      <section className="card">
        <div className="mhead">
          <LastUpdated at={lastUpdate} />
          <button type="button" className="refresh" onClick={load}>
            更新
          </button>
        </div>
        {message ? <p className="mstatus">{message}</p> : null}

        <WorldGrid
          title="お気に入り"
          worlds={favorites}
          emptyMessage="お気に入りワールドはありません。"
          onOpen={setOpenWorld}
        />
        <WorldGrid
          title="最近訪れたワールド"
          worlds={recent}
          emptyMessage="最近訪れたワールドはありません。"
          onOpen={setOpenWorld}
        />
      </section>
      <WorldModal
        worldId={openWorld?.id ?? null}
        worldName={openWorld?.name ?? null}
        thumbnailUrl={openWorld?.thumbnailImageUrl ?? null}
        members={[]}
        onClose={() => setOpenWorld(null)}
      />
    </section>
  );
}
