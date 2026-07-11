import { parseLocation } from "@vrc-toolkit/core/domain";
import { useEffect, useMemo, useState } from "react";
import { LastUpdated } from "../components/LastUpdated";
import { type ViewMode, ViewToggle } from "../components/ViewToggle";
import { friendsStore, useFriends } from "../friendsStore";
import { useVrc } from "../vrc";
import { useWorldNames, worldStore } from "../worldNames";
import { CardModal } from "./friends/CardModal";
import {
  countByPresence,
  filterPeople,
  type PresenceFilter,
  type SortMode,
  sortPeople,
} from "./friends/organize";
import { PersonCard } from "./friends/PersonCard";
import type { Person } from "./friends/people";

const PRESENCE_TABS: { value: PresenceFilter; label: string }[] = [
  { value: "online", label: "オンライン" },
  { value: "all", label: "全員" },
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "default", label: "標準" },
  { value: "name", label: "名前順" },
  { value: "status", label: "ステータス順" },
];

// Person-centric management: search, notes, and trust info for individual
// friends. Where-to-join browsing (world grouping, thumbnails) now lives in
// JoinView instead; both views share one friendsStore fetch.
export function FriendsView() {
  const client = useVrc();
  const nameOf = useWorldNames();
  const { people, status, lastUpdate } = useFriends();

  const [openUserId, setOpenUserId] = useState<string | null>(null);

  // View controls.
  const [gridMode, setGridMode] = useState<ViewMode>("card");
  // Filter controls.
  const [search, setSearch] = useState("");
  const [presence, setPresence] = useState<PresenceFilter>("online");
  const [sort, setSort] = useState<SortMode>("default");

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only load
  useEffect(() => {
    friendsStore.ensureLoaded(client);
  }, []);

  // Resolve world names for the online instance friends, gently and cached.
  useEffect(() => {
    for (const p of people) {
      if (!p.isOnline) continue;
      const parsed = parseLocation(p.location);
      if (parsed.kind === "instance" && parsed.worldId) {
        worldStore.request(client, parsed.worldId);
      }
    }
  }, [people, client]);

  const counts = useMemo(() => countByPresence(people), [people]);

  const visible = useMemo(
    () => sortPeople(filterPeople(people, { search, presence }), sort),
    [people, search, presence, sort],
  );

  const worldNameFor = (p: Person): string | undefined => {
    const parsed = parseLocation(p.location);
    return parsed.kind === "instance" ? nameOf(parsed.worldId) : undefined;
  };

  let emptyMessage: string | null = null;
  if (people.length > 0 && visible.length === 0)
    emptyMessage = "条件に一致するフレンドはいません。";
  const displayStatus = people.length === 0 ? status : emptyMessage;

  return (
    <section id="view-friends">
      <section className="card">
        <div className="mhead">
          <LastUpdated at={lastUpdate} />
          <ViewToggle mode={gridMode} onChange={setGridMode} />
          <button type="button" className="refresh" onClick={() => friendsStore.load(client)}>
            更新
          </button>
        </div>
        <div className="ffilters">
          <input
            className="fsearch"
            type="text"
            placeholder="名前で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="fmode">
            {PRESENCE_TABS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={presence === value ? "fmode-btn active" : "fmode-btn"}
                onClick={() => setPresence(value)}
              >
                {label} <span>({value === "online" ? counts.online : counts.all})</span>
              </button>
            ))}
          </div>
          <select
            className="fsort"
            aria-label="並び順"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {displayStatus ? <p className="mstatus">{displayStatus}</p> : null}

        <div className={`fgrid view-${gridMode}`}>
          {visible.map((p) => (
            <PersonCard
              key={p.userId}
              person={p}
              worldName={worldNameFor(p)}
              onOpen={setOpenUserId}
            />
          ))}
        </div>
      </section>
      <CardModal
        userId={openUserId}
        onClose={() => setOpenUserId(null)}
        onNoteSaved={(userId, note) => friendsStore.updateNote(userId, note)}
      />
    </section>
  );
}
