// CSS background-position/-size for rendering an UploadItem's live crop frame
// as a small thumbnail without redrawing pixels. Mirrors the old Web UI's
// client-script.ts applyThumb().
import { type CropItem, geom } from "@vrc-toolkit/core/domain";
import type { CSSProperties } from "react";
import { cssUrl } from "../cssUrl";

export function cropThumbStyle(item: CropItem, url: string, aspect: number): CSSProperties {
  const g = geom(item, aspect);
  const rangeX = item.natW - g.cw;
  const rangeY = item.natH - g.ch;
  return {
    backgroundImage: cssUrl(url),
    backgroundSize: `${(item.natW / g.cw) * 100}% ${(item.natH / g.ch) * 100}%`,
    backgroundPosition: `${rangeX > 0.0001 ? (g.srcX / rangeX) * 100 : 0}% ${
      rangeY > 0.0001 ? (g.srcY / rangeY) * 100 : 0
    }%`,
  };
}
