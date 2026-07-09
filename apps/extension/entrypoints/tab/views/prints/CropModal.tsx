import { geom } from "@vrc-toolkit/core/domain";
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { PRINT_ASPECT } from "./canvas";
import { ZoomInIcon, ZoomOutIcon } from "./icons";
import type { UploadItem } from "./types";

type EditableFields = Pick<UploadItem, "ncx" | "ncy" | "zoom" | "note" | "worldId" | "worldName">;

interface Props {
  item: UploadItem;
  index: number;
  total: number;
  onChange: (patch: Partial<EditableFields>) => void;
  onClose: () => void;
}

// Drag state lives in a ref, not React state: pointermove fires far faster
// than a render cycle needs, and only the derived ncx/ncy (via onChange)
// needs to trigger a re-render.
interface DragState {
  dragging: boolean;
  sx: number;
  sy: number;
  scx: number;
  scy: number;
  eff: number;
}

export function CropModal({ item, index, total, onChange, onClose }: Props) {
  const cropRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const dragRef = useRef<DragState>({ dragging: false, sx: 0, sy: 0, scx: 0, scy: 0, eff: 1 });

  useLayoutEffect(() => {
    const el = cropRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  const g = item.natW ? geom(item, PRINT_ASPECT) : null;
  const eff = g && containerWidth ? containerWidth / g.cw : 0;
  if (eff) dragRef.current.eff = eff;

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!item.natW) return;
    cropRef.current?.setPointerCapture(e.pointerId);
    dragRef.current.dragging = true;
    dragRef.current.sx = e.clientX;
    dragRef.current.sy = e.clientY;
    dragRef.current.scx = item.ncx * item.natW;
    dragRef.current.scy = item.ncy * item.natH;
  }
  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d.dragging || !d.eff) return;
    onChange({
      ncx: (d.scx - (e.clientX - d.sx) / d.eff) / item.natW,
      ncy: (d.scy - (e.clientY - d.sy) / d.eff) / item.natH,
    });
  }
  function endDrag() {
    dragRef.current.dragging = false;
  }

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
        <p className="hint">ドラッグで位置、スライダーで拡大。枠内（16:9）が Print になります。</p>
        <div
          className="crop"
          ref={cropRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {g && eff > 0 ? (
            <img
              alt=""
              src={item.url}
              style={{
                width: item.natW * eff,
                height: item.natH * eff,
                transform: `translate(${-g.srcX * eff}px, ${-g.srcY * eff}px)`,
              }}
            />
          ) : null}
          <div className="frame" />
        </div>
        <div className="zoom">
          <ZoomOutIcon />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={item.zoom}
            aria-label="拡大"
            onChange={(e) => onChange({ zoom: Number.parseFloat(e.target.value) })}
          />
          <ZoomInIcon />
        </div>
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
