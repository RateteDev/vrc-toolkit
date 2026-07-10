import { VrcError } from "@vrc-toolkit/core";
import {
  fmtDate,
  fmtInventoryItem,
  type InventoryItemSummary,
  type InventoryType,
  inventoryQuery,
} from "@vrc-toolkit/core/domain";
import { useEffect, useState } from "react";
import { LastUpdated } from "../../components/LastUpdated";
import { useVrc } from "../../vrc";
import { cssUrl } from "../cssUrl";

const INV_TABS: { value: InventoryType; label: string }[] = [
  { value: "sticker", label: "ステッカー" },
  { value: "emoji", label: "絵文字" },
];

type ViewMode = "list" | "sm" | "lg";

export function StickerInventoryCard({
  invType,
  onInvTypeChange,
  reloadNonce,
  onOpenUpload,
}: {
  invType: InventoryType;
  onInvTypeChange: (type: InventoryType) => void;
  reloadNonce: number;
  onOpenUpload: () => void;
}) {
  const vrc = useVrc();

  const [items, setItems] = useState<InventoryItemSummary[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>("読み込み中…");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("sm");
  const [manualRefreshNonce, setManualRefreshNonce] = useState(0);

  // reloadNonce (bumped by the parent after an upload) and manualRefreshNonce
  // (bumped by the refresh button) are trigger-only deps: their values aren't
  // read in the body, they exist purely to force a refetch.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see comment above
  useEffect(() => {
    let cancelled = false;
    setStatusMessage("読み込み中…");

    (async () => {
      try {
        const query = inventoryQuery(invType);
        // n=100/offset=0 mirrors the old server-side listInventory page size
        // (spec No.25); the API's own item cap per type is unconfirmed.
        const res = await vrc.inventory.list(query, { n: 100, offset: 0 });
        if (cancelled) return;
        const mapped = (res?.data ?? []).map(fmtInventoryItem);
        setItems(mapped);
        setLastUpdate(new Date());
        setStatusMessage(mapped.length ? null : "所有しているアイテムがありません。");
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof VrcError
            ? err.message
            : `ネットワークエラー: ${err instanceof Error ? err.message : String(err)}`;
        setStatusMessage(message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [invType, reloadNonce, manualRefreshNonce, vrc]);

  return (
    <section className="card">
      <div className="mhead">
        <h2>所有アイテム</h2>
        <LastUpdated at={lastUpdate} />
        <div className="view-toggle">
          <button
            type="button"
            className={viewMode === "list" ? "vtog active" : "vtog"}
            aria-label="リスト表示"
            onClick={() => setViewMode("list")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path
                d="M1 3h12M1 7h12M1 11h12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </button>
          <button
            type="button"
            className={viewMode === "sm" ? "vtog active" : "vtog"}
            aria-label="小カード表示"
            onClick={() => setViewMode("sm")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" />
              <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" />
              <rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" />
              <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" />
            </svg>
          </button>
          <button
            type="button"
            className={viewMode === "lg" ? "vtog active" : "vtog"}
            aria-label="大カード表示"
            onClick={() => setViewMode("lg")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <rect x="1" y="1" width="12" height="5" rx="1" fill="currentColor" />
              <rect x="1" y="8" width="12" height="5" rx="1" fill="currentColor" />
            </svg>
          </button>
        </div>
        <button
          type="button"
          className="refresh"
          onClick={() => setManualRefreshNonce((n) => n + 1)}
        >
          更新
        </button>
      </div>
      <p className="hint">所有しているステッカー・絵文字を一覧します（各 18 枠）。</p>
      <div className="ptoolbar">
        <button type="button" className="postbtn" onClick={onOpenUpload}>
          + 投稿
        </button>
      </div>
      <div className="invtabs">
        {INV_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={invType === t.value ? "invtab active" : "invtab"}
            onClick={() => onInvTypeChange(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {statusMessage && <p className="mstatus">{statusMessage}</p>}
      <div className={`agrid view-${viewMode}`}>
        {items.map((item, index) => (
          // item.id falls back to "" when the API omits it (unconfirmed field
          // name); index keeps keys unique even then.
          <div className="acard" key={item.id || `${invType}-${index}`}>
            <div
              className="athumb"
              style={item.imageUrl ? { backgroundImage: cssUrl(item.imageUrl) } : undefined}
            />
            <div className="abody">
              <div className="aname">{item.name || "（名前なし）"}</div>
              <div className="adate">{fmtDate(item.createdAt)}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
