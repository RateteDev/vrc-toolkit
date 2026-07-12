import type { VRChatWorld } from "@vrc-toolkit/core";
import {
  fmtWorld,
  type WorldFavoriteGroup,
  type WorldSummary,
  worldFavoriteGroups,
} from "@vrc-toolkit/core/domain";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { LastUpdated } from "../components/LastUpdated";
import { useVrc } from "../vrc";
import { errorMessage } from "./errorMessage";
import { WorldModal } from "./join/WorldModal";
import { FavoriteGroupSection } from "./worlds/FavoriteGroupSection";
import { groupFavorites } from "./worlds/groupFavorites";
import { WorldGrid } from "./worlds/WorldGrid";

// VRChat caps /worlds/recent at n=100; a single request (no paging), per the
// unofficial-API policy against high-frequency/bulk calls. Favorites page to
// exhaustion instead (see WorldsResource.favorites) since users can and do
// exceed 100 favorites.
const RECENT_LIMIT = 100;

// The account owner's favorite (grouped, collapsible) and recently-visited
// worlds. Fetched once on mount plus on manual 更新, matching AvatarsGrid's
// load model; no polling.
export function WorldsView() {
  const client = useVrc();
  const [favorites, setFavorites] = useState<VRChatWorld[]>([]);
  const [favoriteGroups, setFavoriteGroups] = useState<WorldFavoriteGroup[]>([]);
  const [recent, setRecent] = useState<WorldSummary[]>([]);
  const [message, setMessage] = useState("読み込み中…");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [openWorld, setOpenWorld] = useState<WorldSummary | null>(null);

  const load = useCallback(() => {
    setMessage("読み込み中…");
    Promise.all([
      client.worlds.favorites(),
      client.worlds.favoriteGroups(),
      client.worlds.recent(RECENT_LIMIT),
    ])
      .then(([favoriteWorlds, groups, recentWorlds]) => {
        setFavorites(favoriteWorlds);
        setFavoriteGroups(worldFavoriteGroups(groups));
        setRecent(recentWorlds.map(fmtWorld));
        setMessage("");
        setLastUpdate(new Date());
      })
      .catch((err: unknown) => setMessage(`ネットワークエラー: ${errorMessage(err)}`));
  }, [client]);

  useEffect(() => {
    load();
  }, [load]);

  const favoriteSections = groupFavorites(favorites, favoriteGroups);

  return (
    <section id="view-worlds">
      <section className="card">
        <div className="mhead">
          <LastUpdated at={lastUpdate} />
          <button type="button" className="refresh" aria-label="更新" title="更新" onClick={load}>
            <Icon name="refresh" size={16} />
          </button>
        </div>
        {message ? <p className="mstatus">{message}</p> : null}

        <section className="wsec">
          <h3 className="wsec-title">お気に入り ({favorites.length})</h3>
          {favoriteSections.map((section) => (
            <FavoriteGroupSection
              key={section.key}
              displayName={section.displayName}
              worlds={section.worlds}
              onOpen={setOpenWorld}
            />
          ))}
        </section>

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
