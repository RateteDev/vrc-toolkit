import { parseLocation, toFriendSummary } from "@vrc-toolkit/core/domain";
import { useEffect, useMemo, useState } from "react";
import { LastUpdated } from "../components/LastUpdated";
import { type ViewMode, ViewToggle } from "../components/ViewToggle";
import { useVrc } from "../vrc";
import { useWorldNames, worldNameStore } from "../worldNames";
import { CardModal } from "./friends/CardModal";
import {
  countByPresence,
  filterPeople,
  groupByWorld,
  type PresenceFilter,
  type SortMode,
  sortPeople,
} from "./friends/organize";
import { PersonCard } from "./friends/PersonCard";
import { buildPeople, type Person } from "./friends/people";

const PRESENCE_TABS: { value: PresenceFilter; label: string }[] = [
  { value: "joinable", label: "参加可能" },
  { value: "online", label: "オンライン" },
  { value: "all", label: "全員" },
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "default", label: "標準" },
  { value: "name", label: "名前順" },
  { value: "status", label: "ステータス順" },
];

export function FriendsView() {
  const client = useVrc();
  const nameOf = useWorldNames();

  const [people, setPeople] = useState<Person[]>([]);
  const [status, setStatus] = useState<string | null>("読み込み中…");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [openUserId, setOpenUserId] = useState<string | null>(null);

  // View controls.
  const [gridMode, setGridMode] = useState<ViewMode>("card");
  const [groupByWorldOn, setGroupByWorldOn] = useState(false);
  // Filter controls.
  const [search, setSearch] = useState("");
  const [presence, setPresence] = useState<PresenceFilter>("online");
  const [sort, setSort] = useState<SortMode>("default");

  const load = () => {
    setStatus("読み込み中…");
    // Online friends: a single page (n=100). Notes: paged to exhaustion.
    Promise.all([client.friends.list({ offline: false, n: 100 }), client.notes.listAll()])
      .then(([friends, notes]) => {
        setPeople(buildPeople(friends.map(toFriendSummary), notes));
        setLastUpdate(new Date());
        setStatus(null);
      })
      .catch((e: unknown) => {
        setStatus(`ネットワークエラー: ${e instanceof Error ? e.message : String(e)}`);
      });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only load
  useEffect(() => {
    load();
  }, []);

  // Resolve world names for the online instance friends, gently and cached.
  useEffect(() => {
    for (const p of people) {
      if (!p.isOnline) continue;
      const parsed = parseLocation(p.location);
      if (parsed.kind === "instance" && parsed.worldId) {
        worldNameStore.request(client, parsed.worldId);
      }
    }
  }, [people, client]);

  const counts = useMemo(() => countByPresence(people), [people]);

  const visible = useMemo(
    () => sortPeople(filterPeople(people, { search, presence }), sort),
    [people, search, presence, sort],
  );

  const groups = useMemo(
    () => (groupByWorldOn ? groupByWorld(visible, nameOf) : null),
    [groupByWorldOn, visible, nameOf],
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
          <h2>フレンド</h2>
          <LastUpdated at={lastUpdate} />
          <ViewToggle mode={gridMode} onChange={setGridMode} />
          <button
            type="button"
            className={groupByWorldOn ? "grpbtn active" : "grpbtn"}
            aria-pressed={groupByWorldOn}
            onClick={() => setGroupByWorldOn((v) => !v)}
          >
            ワールド別
          </button>
          <button type="button" className="refresh" onClick={load}>
            更新
          </button>
        </div>
        <p className="hint">
          オンラインのフレンドとメモ付きユーザーを表示します。カードをタップで名刺を開きます。
        </p>

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
                {label}{" "}
                <span>
                  (
                  {value === "joinable"
                    ? counts.joinable
                    : value === "online"
                      ? counts.online
                      : counts.all}
                  )
                </span>
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

        {groups ? (
          <div className="fgroups">
            {groups.map((g) => (
              <div key={g.key} className="fgroup">
                <div className="fgroup-head">
                  <span className="fgroup-name">
                    {g.key === "__other__" ? "その他" : (g.worldName ?? "読み込み中…")}
                  </span>
                  <span className="fgroup-count">{g.members.length}</span>
                </div>
                <div className={`fgrid view-${gridMode}`}>
                  {g.members.map((p) => (
                    <PersonCard
                      key={p.userId}
                      person={p}
                      worldName={worldNameFor(p)}
                      onOpen={setOpenUserId}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
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
        )}
      </section>
      <CardModal userId={openUserId} onClose={() => setOpenUserId(null)} onNoteSaved={load} />
    </section>
  );
}
