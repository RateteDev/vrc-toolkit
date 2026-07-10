import { useState } from "react";
import { HeaderStatus } from "./components/HeaderStatus";
import { AvatarsView } from "./views/AvatarsView";
import { FriendsView } from "./views/FriendsView";
import { PrintsView } from "./views/PrintsView";
import { StickersView } from "./views/StickersView";

// Flat tab bar in resource order. Only the four first-stage sections are wired;
// groups / worlds / profile join here as they are built (the account owner's
// status moved out to the header widget, so there is no "自分" tab).
const TABS = [
  {
    view: "friends",
    label: "フレンド",
    title: "フレンド",
    hint: "フレンドの在席・滞在先とメモを表示",
  },
  { view: "avatars", label: "アバター", title: "アバター", hint: "所有アバターを更新日順に一覧" },
  { view: "prints", label: "プリント", title: "プリント", hint: "Print の投稿と管理" },
  {
    view: "stickers",
    label: "ステッカー",
    title: "ステッカー",
    hint: "ステッカー・絵文字のアップロードと所有アイテム管理",
  },
] as const;

type ViewName = (typeof TABS)[number]["view"];

export function Layout() {
  const [activeView, setActiveView] = useState<ViewName>("friends");
  const active = TABS.find((tab) => tab.view === activeView) ?? TABS[0];

  return (
    <main className="wrap">
      <header className="site-header rise d1">
        <span className="brand">VRC Toolkit</span>
        <HeaderStatus />
      </header>
      <h1 id="viewTitle" className="view-title rise d1">
        {active.title}
      </h1>

      <nav className="tabs rise d2">
        {TABS.map((tab) => (
          <button
            key={tab.view}
            type="button"
            className={tab.view === activeView ? "tab active" : "tab"}
            onClick={() => setActiveView(tab.view)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section id="group-friends" hidden={activeView !== "friends"}>
        <FriendsView />
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

      <footer className="rise d3">
        <span id="footerHint">{active.hint}</span>
        <span className="sep">·</span>
        VRChat 非公式ツール（VRChat とは無関係です）
      </footer>
    </main>
  );
}
