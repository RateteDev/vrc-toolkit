// Canvas glue for the print upload's final image export. The crop rectangle
// comes from domain/crop's geom() (pure, unit-tested in core); this module
// only owns the Image/Canvas plumbing to turn that rectangle into pixels.
// Bun cannot run a DOM Canvas, so this file has no unit test — verify by
// manual smoke (add an image, adjust the crop, submit, inspect the result).
//
// The old server-side tool (vrc-toolkit-worker/src/tools/prints/preprocess.ts)
// letterboxed arbitrary images via a Cloudflare Images binding for callers that
// never go through interactive cropping (CLI/MCP). The Web UI being ported
// here never used that path: it always lets the user pick a 16:9 frame via
// CropModal, then crops (not pads) directly onto a 1920x1080 canvas. This
// keeps that behavior — cover-fit crop, not letterbox — since it's what the
// ported UploadView/CropModal actually drive.
import { type CropItem, geom, PRINT_HEIGHT, PRINT_WIDTH } from "@vrc-toolkit/core/domain";

export const PRINT_ASPECT = 16 / 9;

const OUTPUT_TYPE = "image/jpeg";
const OUTPUT_QUALITY = 0.92;

// A CropItem plus the objectURL to load pixels from.
export interface CropSource extends CropItem {
  url: string;
}

// True when cropping would be a no-op: an unmodified (zoom=1, centered) frame
// over a source that is already an exact 1920x1080 JPEG. Re-encoding such a
// source would only lose quality for a visually identical result, so the
// caller can skip the canvas pass and upload the original bytes.
export function isAlreadyConformant(item: CropSource, sourceType: string): boolean {
  return (
    sourceType === OUTPUT_TYPE &&
    item.natW === PRINT_WIDTH &&
    item.natH === PRINT_HEIGHT &&
    item.zoom === 1 &&
    item.ncx === 0.5 &&
    item.ncy === 0.5
  );
}

// Crop `item`'s frame onto a PRINT_WIDTH x PRINT_HEIGHT canvas and export it
// as a JPEG blob (mirrors the old Web UI's client-script.ts cropToBlob).
export function cropToPrintBlob(item: CropSource, sourceBlob: Blob): Promise<Blob> {
  if (isAlreadyConformant(item, sourceBlob.type)) {
    return Promise.resolve(sourceBlob);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const g = geom(item, PRINT_ASPECT);
      const canvas = document.createElement("canvas");
      canvas.width = PRINT_WIDTH;
      canvas.height = PRINT_HEIGHT;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("2d canvas context unavailable"));
        return;
      }
      ctx.drawImage(img, g.srcX, g.srcY, g.cw, g.ch, 0, 0, PRINT_WIDTH, PRINT_HEIGHT);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("crop failed"));
        },
        OUTPUT_TYPE,
        OUTPUT_QUALITY,
      );
    };
    img.onerror = () => reject(new Error("画像を読み込めませんでした"));
    img.src = item.url;
  });
}
