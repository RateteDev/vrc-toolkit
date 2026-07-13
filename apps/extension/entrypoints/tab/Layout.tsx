import { useState } from "react";
import { HeaderStatus } from "./components/HeaderStatus";
import { AvatarsView } from "./views/AvatarsView";
import { FriendsView } from "./views/FriendsView";
import { GroupsView } from "./views/GroupsView";
import { JoinView } from "./views/JoinView";
import { PrintsView } from "./views/PrintsView";
import { StickersView } from "./views/StickersView";
import { WorldsView } from "./views/WorldsView";

// Flat tab bar in resource order. JOIN先 leads and is the default view: it is
// the world-centric "where do I join" question, which is what most sessions
// open the tab to answer; フレンド stays person-centric for search/notes.
// groups / profile join here as they are built (the account owner's status
// moved out to the header widget, so there is no "自分" tab).
const TABS = [
  { view: "join", label: "JOIN先", hint: "フレンドの滞在ワールドからJOIN先を探す" },
  { view: "friends", label: "フレンド", hint: "フレンドの在席・滞在先とメモを表示" },
  { view: "worlds", label: "ワールド", hint: "お気に入り・最近訪れたワールドを一覧" },
  { view: "groups", label: "グループ", hint: "所属グループの投稿と開催中インスタンスを表示" },
  { view: "avatars", label: "アバター", hint: "所有アバターを更新日順に一覧" },
  { view: "prints", label: "プリント", hint: "Print の投稿と管理" },
  {
    view: "stickers",
    label: "ステッカー",
    hint: "ステッカー・絵文字のアップロードと所有アイテム管理",
  },
] as const;

type ViewName = (typeof TABS)[number]["view"];

export function Layout() {
  const [activeView, setActiveView] = useState<ViewName>("join");

  return (
    <main className="wrap">
      <header className="site-header rise d1">
        <h1 className="brand">VRC Toolkit</h1>
        <HeaderStatus />
      </header>

      <nav className="tabs rise d2">
        {TABS.map((tab) => (
          <button
            key={tab.view}
            type="button"
            className={tab.view === activeView ? "tab active" : "tab"}
            title={tab.hint}
            onClick={() => setActiveView(tab.view)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section id="group-join" hidden={activeView !== "join"}>
        <JoinView />
      </section>
      <section id="group-friends" hidden={activeView !== "friends"}>
        <FriendsView />
      </section>
      <section id="group-worlds" hidden={activeView !== "worlds"}>
        <WorldsView />
      </section>
      <section id="group-groups" hidden={activeView !== "groups"}>
        <GroupsView />
      </section>
      <section id="group-avatars" hidden={activeView !== "avatars"}>
        <AvatarsView />
      </section>
      <section id="group-prints" hidden={activeView !== "prints"}>
        <PrintsView />
      </section>
      <section id="group-stickers" hidden={activeView !== "stickers"}>
        <StickersView />
      </section>

      {/* No footer for now: tab hints moved to the tab buttons' titles, and
          the unofficial-tool disclaimer returns (with contact info) at release. */}
    </main>
  );
}
