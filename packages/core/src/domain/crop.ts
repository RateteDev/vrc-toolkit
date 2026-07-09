// Crop geometry helpers for the client-side image cropper. Pure: uses only Math.

export interface CropItem {
  natW: number;
  natH: number;
  zoom: number;
  ncx: number;
  ncy: number;
}

export interface CropGeom {
  cw: number;
  ch: number;
  srcX: number;
  srcY: number;
  // Re-clamped center, normalized to [0,1]. The caller decides whether/how to
  // write this back onto its own CropItem; geom itself never mutates input.
  ncx: number;
  ncy: number;
}

// Crop geometry for aspect `a` (e.g. 16/9). Re-clamps the stored center into
// bounds and returns the clamped ncx/ncy alongside the pixel geometry.
export function geom(it: CropItem, a: number): CropGeom {
  let cw0: number;
  let ch0: number;
  if (it.natW / it.natH >= a) {
    ch0 = it.natH;
    cw0 = it.natH * a;
  } else {
    cw0 = it.natW;
    ch0 = it.natW / a;
  }
  const cw = cw0 / it.zoom;
  const ch = ch0 / it.zoom;
  let cx = it.ncx * it.natW;
  let cy = it.ncy * it.natH;
  cx = Math.min(it.natW - cw / 2, Math.max(cw / 2, cx));
  cy = Math.min(it.natH - ch / 2, Math.max(ch / 2, cy));
  return { cw, ch, srcX: cx - cw / 2, srcY: cy - ch / 2, ncx: cx / it.natW, ncy: cy / it.natH };
}
