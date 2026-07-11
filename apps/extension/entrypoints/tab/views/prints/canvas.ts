// Canvas glue for cropped image exports. The crop rectangle comes from
// domain/crop's geom() (pure, unit-tested in core); this module only owns the
// Image/Canvas plumbing to turn that rectangle into pixels. Bun cannot run a
// DOM Canvas, so this file has no unit test — verify by manual smoke (add an
// image, adjust the crop, submit, inspect the result).
//
// The old server-side tool (vrc-toolkit-worker/src/tools/prints/preprocess.ts)
// letterboxed arbitrary images via a Cloudflare Images binding for callers that
// never go through interactive cropping (CLI/MCP). The Web UI being ported
// here never used that path: it always lets the user pick a frame via
// CropModal, then crops (not pads) directly onto the output canvas. This
// keeps that behavior — cover-fit crop, not letterbox.
//
// Originally print-only (fixed 16:9 / 1920x1080); the avatar-image-change flow
// (views/me/AvatarImageModal.tsx) reuses this same machinery at 4:3 / 1200x900,
// so the aspect/output/encoding are now explicit parameters (CropOutputSpec)
// rather than baked-in constants. Callers must pass their own spec — no
// fallback default — per the project's no-hidden-defaults convention.
import { type CropItem, geom } from "@vrc-toolkit/core/domain";

export const PRINT_ASPECT = 16 / 9;
export const PRINT_OUTPUT_TYPE = "image/jpeg";
export const PRINT_OUTPUT_QUALITY = 0.92;

export const AVATAR_ASPECT = 4 / 3;
export const AVATAR_WIDTH = 1200;
export const AVATAR_HEIGHT = 900;
export const AVATAR_OUTPUT_TYPE = "image/jpeg";
export const AVATAR_OUTPUT_QUALITY = 0.92;

// A CropItem plus the objectURL to load pixels from.
export interface CropSource extends CropItem {
  url: string;
}

// The output this crop pass must produce: frame aspect, canvas pixel size, and
// export encoding. Explicit per caller (prints vs. avatar image) so neither
// flow silently inherits the other's numbers.
export interface CropOutputSpec {
  aspect: number;
  outputWidth: number;
  outputHeight: number;
  type: string;
  quality: number;
}

// True when cropping would be a no-op: an unmodified (zoom=1, centered) frame
// over a source that is already an exact-size JPEG matching `spec`. Re-encoding
// such a source would only lose quality for a visually identical result, so
// the caller can skip the canvas pass and upload the original bytes.
export function isAlreadyConformant(
  item: CropSource,
  sourceType: string,
  spec: CropOutputSpec,
): boolean {
  return (
    sourceType === spec.type &&
    item.natW === spec.outputWidth &&
    item.natH === spec.outputHeight &&
    item.zoom === 1 &&
    item.ncx === 0.5 &&
    item.ncy === 0.5
  );
}

// Crop `item`'s frame onto an `outputWidth` x `outputHeight` canvas per `spec`
// and export it as a blob (mirrors the old Web UI's client-script.ts
// cropToBlob, generalized beyond the print-only 16:9/1920x1080 case).
export function cropToBlob(
  item: CropSource,
  sourceBlob: Blob,
  spec: CropOutputSpec,
): Promise<Blob> {
  if (isAlreadyConformant(item, sourceBlob.type, spec)) {
    return Promise.resolve(sourceBlob);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const g = geom(item, spec.aspect);
      const canvas = document.createElement("canvas");
      canvas.width = spec.outputWidth;
      canvas.height = spec.outputHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("2d canvas context unavailable"));
        return;
      }
      ctx.drawImage(img, g.srcX, g.srcY, g.cw, g.ch, 0, 0, spec.outputWidth, spec.outputHeight);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("crop failed"));
        },
        spec.type,
        spec.quality,
      );
    };
    img.onerror = () => reject(new Error("画像を読み込めませんでした"));
    img.src = item.url;
  });
}
