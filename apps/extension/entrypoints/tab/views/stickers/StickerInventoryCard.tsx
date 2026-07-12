import { VrcError } from "@vrc-toolkit/core";
import {
  fmtDate,
  fmtInventoryItem,
  type InventoryItemSummary,
  type InventoryType,
  inventoryQuery,
} from "@vrc-toolkit/core/domain";
import { useEffect, useState } from "react";
import { Icon } from "../../components/Icon";
import { LastUpdated } from "../../components/LastUpdated";
import { type ViewMode, ViewToggle } from "../../components/ViewToggle";
import { useVrc } from "../../vrc";
import { cssUrl } from "../cssUrl";

const INV_TABS: { value: InventoryType; label: string }[] = [
  { value: "sticker", label: "ステッカー" },
  { value: "emoji", label: "絵文字" },
];

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
  const [viewMode, setViewMode] = useState<ViewMode>("card");
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
        const raw = await vrc.inventory.listAll(query);
        if (cancelled) return;
        const mapped = raw.map(fmtInventoryItem);
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
        <ViewToggle mode={viewMode} onChange={setViewMode} />
        <LastUpdated at={lastUpdate} />
        <button
          type="button"
          className="refresh"
          aria-label="更新"
          title="更新"
          onClick={() => setManualRefreshNonce((n) => n + 1)}
        >
          <Icon name="refresh" size={16} />
        </button>
      </div>
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
