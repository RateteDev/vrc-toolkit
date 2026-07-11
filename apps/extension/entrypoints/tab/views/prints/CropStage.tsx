// The interactive crop surface (drag-to-reposition image + zoom slider +
// frame overlay), extracted out of CropModal so the avatar-image-change flow
// (views/me/AvatarImageModal.tsx) can reuse the exact same pointer/zoom
// mechanics at a different aspect ratio without duplicating them.
import { geom } from "@vrc-toolkit/core/domain";
import { type PointerEvent as ReactPointerEvent, useLayoutEffect, useRef, useState } from "react";
import { ZoomInIcon, ZoomOutIcon } from "./icons";

// The subset of a crop item this stage needs: source dimensions plus the
// normalized center/zoom it reads and writes via onChange.
export interface CropStageItem {
  natW: number;
  natH: number;
  ncx: number;
  ncy: number;
  zoom: number;
}

interface Props {
  url: string;
  item: CropStageItem;
  aspect: number;
  onChange: (patch: Partial<Pick<CropStageItem, "ncx" | "ncy" | "zoom">>) => void;
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

export function CropStage({ url, item, aspect, onChange }: Props) {
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

  const g = item.natW ? geom(item, aspect) : null;
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
    <>
      <div
        className="crop"
        style={{ aspectRatio: aspect }}
        ref={cropRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {g && eff > 0 ? (
          <img
            alt=""
            src={url}
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
    </>
  );
}
