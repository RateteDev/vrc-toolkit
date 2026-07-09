import { useCallback, useEffect, useRef, useState } from "react";
import { FriendsView } from "./views/FriendsView";
import { MeView } from "./views/MeView";
import { PrintsView } from "./views/PrintsView";
import { StickersView } from "./views/StickersView";

function extractImageFiles(e: ClipboardEvent): File[] {
  const cd = e.clipboardData;
  if (!cd?.items) return [];
  const out: File[] = [];
  for (let i = 0; i < cd.items.length; i++) {
    const item = cd.items[i];
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const f = item.getAsFile();
      if (f) out.push(f);
    }
  }
  return out;
}

// The four sections and their per-view title/footer copy, ported verbatim from
// the Worker UI (VIEW_TITLES / FOOTER_HINTS in the old client-script).
const TABS = [
  {
    view: "prints",
    label: "プリント",
    title: "プリント",
    hint: "Print の投稿・管理・整理を行います",
  },
  {
    view: "friends",
    label: "フレンド",
    title: "フレンド",
    hint: "フレンド状況・メモ・タグ・活動レポートを表示",
  },
  {
    view: "me",
    label: "自分",
    title: "自分",
    hint: "ステータス切替とマイアバターを管理",
  },
  {
    view: "images",
    label: "ステッカー",
    title: "ステッカー",
    hint: "ステッカー・絵文字のアップロードと所有アイテム管理",
  },
] as const;

type ViewName = (typeof TABS)[number]["view"];

export type PasteHandler = (files: File[]) => void;

export function Layout() {
  const [activeView, setActiveView] = useState<ViewName>("prints");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const printsPasteRef = useRef<PasteHandler | null>(null);
  const stickersPasteRef = useRef<PasteHandler | null>(null);

  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase() ?? "";
      if (tag === "input" || tag === "textarea") return;
      const files = extractImageFiles(e);
      if (!files.length) return;
      e.preventDefault();
      if (activeView === "prints") {
        printsPasteRef.current?.(files);
      } else if (activeView === "images") {
        stickersPasteRef.current?.(files);
      } else {
        setActiveView("prints");
        printsPasteRef.current?.(files);
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [activeView]);

  const active = TABS.find((tab) => tab.view === activeView) ?? TABS[0];

  const select = (view: ViewName) => {
    setActiveView(view);
    setDrawerOpen(false);
  };

  return (
    <main className="wrap">
      <header className="site-header rise d1">
        <span className="brand">VRC Toolkit</span>
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

      <button
        type="button"
        aria-label="メニューを閉じる"
        className={drawerOpen ? "drawer-overlay open" : "drawer-overlay"}
        style={{ border: "none", padding: 0 }}
        onClick={() => setDrawerOpen(false)}
      />
      <nav className={drawerOpen ? "drawer open" : "drawer"}>
        <button
          type="button"
          className="drawer-close"
          aria-label="閉じる"
          onClick={() => setDrawerOpen(false)}
        >
          ×
        </button>
        {TABS.map((tab) => (
          <button
            key={tab.view}
            type="button"
            className={tab.view === activeView ? "drawer-item active" : "drawer-item"}
            onClick={() => select(tab.view)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <button
        type="button"
        className="fab-menu"
        aria-label="メニュー"
        onClick={() => setDrawerOpen(true)}
      >
        ☰
      </button>

      <section id="group-prints" hidden={activeView !== "prints"}>
        <PrintsView onPasteRef={printsPasteRef} />
      </section>
      <section id="group-friends" hidden={activeView !== "friends"}>
        <FriendsView />
      </section>
      <section id="group-me" hidden={activeView !== "me"}>
        <MeView />
      </section>
      <section id="group-images" hidden={activeView !== "images"}>
        <StickersView onPasteRef={stickersPasteRef} />
      </section>

      <footer className="rise d3">
        <span id="footerHint">{active.hint}</span>
        <span className="sep">·</span>
        VRChat 非公式ツール（VRChat とは無関係です）
      </footer>
    </main>
  );
}
