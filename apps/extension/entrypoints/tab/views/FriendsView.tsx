import { isJoinable, parseLocation, toFriendSummary } from "@vrc-toolkit/core/domain";
import { useEffect, useState } from "react";
import { useVrc } from "../vrc";
import { CardModal } from "./friends/CardModal";
import { PersonCard } from "./friends/PersonCard";
import { buildPeople, type Person } from "./friends/people";

type FriendMode = "online" | "all";
type GridViewMode = "list" | "sm" | "lg";

const VIEW_TOGGLE_MODES: { mode: GridViewMode; label: string }[] = [
  { mode: "list", label: "リスト表示" },
  { mode: "sm", label: "小カード表示" },
  { mode: "lg", label: "大カード表示" },
];

function formatClock(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function FriendsView() {
  const client = useVrc();
  const [people, setPeople] = useState<Person[]>([]);
  const [status, setStatus] = useState<string | null>("読み込み中…");
  const [mode, setMode] = useState<FriendMode>("online");
  const [joinableOnly, setJoinableOnly] = useState(false);
  const [gridMode, setGridMode] = useState<GridViewMode>("sm");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [openUserId, setOpenUserId] = useState<string | null>(null);

  const load = () => {
    setStatus("読み込み中…");
    // Friends: a single page (n=100), matching the Worker UI's dashboard call
    // — online friend counts rarely exceed 100, and this keeps the request
    // count minimal. Notes: paged to exhaustion since the owner's note count
    // is unbounded.
    Promise.all([client.friends.list({ offline: false, n: 100 }), client.notes.listAll()])
      .then(([friends, notes]) => {
        const merged = buildPeople(friends.map(toFriendSummary), notes);
        setPeople(merged);
        setLastUpdate(new Date());
      })
      .catch((e: unknown) => {
        setStatus(`ネットワークエラー: ${e instanceof Error ? e.message : String(e)}`);
      });
  };

  // Loads once on mount. There is no lazy per-tab-switch trigger like the old
  // SPA's triggerLoad(), because Layout mounts every view eagerly and only
  // toggles a `hidden` attribute.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only load
  useEffect(() => {
    load();
  }, []);

  const onlineCount = people.filter((p) => p.isOnline).length;
  const list = people.filter((p) => {
    if (mode === "online" && !p.isOnline) return false;
    if (joinableOnly && (!p.isOnline || !isJoinable(parseLocation(p.location)))) return false;
    return true;
  });

  let emptyMessage: string | null = null;
  if (people.length > 0 && list.length === 0) {
    if (joinableOnly) emptyMessage = "参加可能なフレンドはいません。";
    else if (mode === "online") emptyMessage = "オンラインのフレンドはいません。";
    else emptyMessage = "フレンドやメモはまだありません。";
  }
  const displayStatus = people.length === 0 ? status : emptyMessage;

  return (
    <section id="view-friends">
      <section className="card">
        <div className="mhead">
          <h2>フレンド</h2>
          {lastUpdate && <span className="flast-update">最終更新: {formatClock(lastUpdate)}</span>}
          <div className="view-toggle">
            {VIEW_TOGGLE_MODES.map(({ mode: m, label }) => (
              <button
                key={m}
                type="button"
                className={gridMode === m ? "vtog active" : "vtog"}
                aria-label={label}
                onClick={() => setGridMode(m)}
              >
                {m === "list" && (
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                    <path
                      d="M1 3h12M1 7h12M1 11h12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                )}
                {m === "sm" && (
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                    <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" />
                    <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" />
                    <rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" />
                    <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" />
                  </svg>
                )}
                {m === "lg" && (
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                    <rect x="1" y="1" width="12" height="5" rx="1" fill="currentColor" />
                    <rect x="1" y="8" width="12" height="5" rx="1" fill="currentColor" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <button type="button" className="refresh" onClick={load}>
            更新
          </button>
        </div>
        <p className="hint">
          オンラインのフレンドとメモ付きユーザーをまとめて表示します。カードをタップで名刺を開きます。
        </p>
        <div className="ffilter-row">
          <div className="fmode">
            <button
              type="button"
              className={mode === "online" ? "fmode-btn active" : "fmode-btn"}
              onClick={() => setMode("online")}
            >
              オンライン <span>({onlineCount})</span>
            </button>
            <button
              type="button"
              className={mode === "all" ? "fmode-btn active" : "fmode-btn"}
              onClick={() => setMode("all")}
            >
              すべて <span>({people.length})</span>
            </button>
          </div>
          <label className="ftoggle">
            <input
              type="checkbox"
              checked={joinableOnly}
              onChange={(e) => setJoinableOnly(e.target.checked)}
            />{" "}
            参加可能のみ
          </label>
        </div>
        {/*
          The old "タグで絞り込み" filter chip row went here. It depends on
          local tags, which are out of scope this stage (no client-side
          persistence layer yet) — see the omission note in CardModal.
        */}
        {displayStatus && <p className="mstatus">{displayStatus}</p>}
        <div className={`fgrid view-${gridMode}`}>
          {list.map((p) => (
            <PersonCard key={p.userId} person={p} onOpen={setOpenUserId} />
          ))}
        </div>
      </section>
      <CardModal userId={openUserId} onClose={() => setOpenUserId(null)} onNoteSaved={load} />
    </section>
  );
}
