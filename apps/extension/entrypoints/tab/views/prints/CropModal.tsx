import { useEffect } from "react";
import { CropStage } from "./CropStage";
import type { UploadItem } from "./types";

type EditableFields = Pick<UploadItem, "ncx" | "ncy" | "zoom" | "note" | "worldId" | "worldName">;

interface Props {
  item: UploadItem;
  index: number;
  total: number;
  // Print-specific today, but explicit rather than hard-coded so this modal's
  // crop step is not tied to PRINT_ASPECT — the caller owns its own aspect and
  // its own copy for the frame hint (e.g. "16:9" vs "4:3").
  aspect: number;
  hint: string;
  onChange: (patch: Partial<EditableFields>) => void;
  onClose: () => void;
}

export function CropModal({ item, index, total, aspect, hint, onChange, onClose }: Props) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="画像を編集">
      {/* Backdrop as its own control (mirrors Layout.tsx's drawer-overlay
          button) rather than an onClick on the dialog div itself: the sheet
          holds form controls, so the backdrop can't be the button that wraps
          it, and a plain div-with-onClick fails a11y click/keyboard parity
          rules. */}
      <button
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          border: "none",
          padding: 0,
          background: "none",
          cursor: "default",
        }}
      />
      <div className="sheet">
        <button type="button" className="close" aria-label="閉じる" onClick={onClose}>
          ×
        </button>
        <div className="shead">
          <h2>切り抜き</h2>
          <span className="ix">
            {index + 1} / {total}
          </span>
        </div>
        <p className="hint">{hint}</p>
        <CropStage
          url={item.url}
          item={item}
          aspect={aspect}
          onChange={(patch) => onChange(patch)}
        />
        <div className="field">
          <label htmlFor="print-crop-note">ノート</label>
          <textarea
            id="print-crop-note"
            placeholder="この一枚について…"
            value={item.note}
            onChange={(e) => onChange({ note: e.target.value })}
          />
        </div>
        <div className="two field">
          <div>
            <label htmlFor="print-crop-world-id">World ID</label>
            <input
              id="print-crop-world-id"
              type="text"
              placeholder="wrld_…"
              value={item.worldId}
              onChange={(e) => onChange({ worldId: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="print-crop-world-name">World 名</label>
            <input
              id="print-crop-world-name"
              type="text"
              placeholder="撮影した場所"
              value={item.worldName}
              onChange={(e) => onChange({ worldName: e.target.value })}
            />
          </div>
        </div>
        <button type="button" className="done" onClick={onClose}>
          完了
        </button>
      </div>
    </div>
  );
}
