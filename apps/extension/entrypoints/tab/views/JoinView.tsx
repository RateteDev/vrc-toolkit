import { useEffect, useMemo, useState } from "react";
import { LastUpdated } from "../components/LastUpdated";
import { friendsStore, useFriends } from "../friendsStore";
import { useVrc } from "../vrc";
import { useWorldEntries, worldStore } from "../worldNames";
import { CardModal } from "./friends/CardModal";
import { groupByWorld, isPersonJoinable } from "./friends/organize";
import { WorldCard } from "./join/WorldCard";
import { WorldModal } from "./join/WorldModal";

// World-centric, image-forward, zero-filter view for deciding where to join.
// Person-centric search/notes management lives in FriendsView instead; both
// views read the same friendsStore so there is only one friends+notes fetch.
export function JoinView() {
  const client = useVrc();
  const { people, status, lastUpdate } = useFriends();
  const worldEntryOf = useWorldEntries();
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [openWorldId, setOpenWorldId] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only load
  useEffect(() => {
    friendsStore.ensureLoaded(client);
  }, []);

  const joinable = useMemo(() => people.filter(isPersonJoinable), [people]);

  // Every joinable person is, by definition, online in a resolvable instance
  // world, so groupByWorld never produces an "__other__" bucket here — the
  // filter below is defensive, matching groupByWorld's general contract
  // rather than relying on that invariant.
  const groups = useMemo(() => {
    const nameOf = (id: string | null | undefined) => (id ? worldEntryOf(id)?.name : undefined);
    return groupByWorld(joinable, nameOf).filter((g) => g.key !== "__other__");
  }, [joinable, worldEntryOf]);

  // Resolve world names + thumbnails for the visible groups, gently and cached.
  useEffect(() => {
    for (const g of groups) {
      worldStore.request(client, g.key);
    }
  }, [groups, client]);

  let emptyMessage: string | null = null;
  if (people.length > 0 && groups.length === 0) {
    emptyMessage = "現在JOINできるフレンドはいません。";
  }
  const displayStatus = people.length === 0 ? status : emptyMessage;

  return (
    <section id="view-join">
      <section className="card">
        <div className="mhead">
          <LastUpdated at={lastUpdate} />
          <button type="button" className="refresh" onClick={() => friendsStore.load(client)}>
            更新
          </button>
        </div>
        {displayStatus ? <p className="mstatus">{displayStatus}</p> : null}

        <div className="jworld-list">
          {groups.map((g) => (
            <WorldCard
              key={g.key}
              worldId={g.key}
              worldName={g.worldName}
              thumbnailUrl={worldEntryOf(g.key)?.thumbnailImageUrl ?? null}
              members={g.members}
              onOpenMember={setOpenUserId}
              onOpenWorld={setOpenWorldId}
            />
          ))}
        </div>
      </section>
      <CardModal
        userId={openUserId}
        onClose={() => setOpenUserId(null)}
        onNoteSaved={(userId, note) => friendsStore.updateNote(userId, note)}
      />
      <WorldModal
        worldId={openWorldId}
        worldName={openWorldId ? (worldEntryOf(openWorldId)?.name ?? null) : null}
        thumbnailUrl={openWorldId ? (worldEntryOf(openWorldId)?.thumbnailImageUrl ?? null) : null}
        members={groups.find((g) => g.key === openWorldId)?.members ?? []}
        onClose={() => setOpenWorldId(null)}
      />
    </section>
  );
}
