// Input validation for print uploads (the pure pre-checks). VRChat prints are
// 1920x1080; oversized/empty/unsupported uploads are rejected before any work.
// The image-normalization transform (normalizeForPrint) depends on the platform
// Images binding and is intentionally NOT part of the dependency-free domain.

export const PRINT_WIDTH = 1920;
export const PRINT_HEIGHT = 1080;

// Reject uploads larger than this before doing any work.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// Input formats we accept and hand to the image transform.
const ALLOWED_INPUT_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export class ImageValidationError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message);
    this.name = "ImageValidationError";
  }
}

// Validate the raw upload before reading or transforming it.
export function validateUpload(file: File): void {
  if (file.size === 0) {
    throw new ImageValidationError("image file is empty");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImageValidationError(`image exceeds the ${MAX_UPLOAD_BYTES}-byte limit`, 413);
  }
  if (file.type !== "" && !ALLOWED_INPUT_TYPES.includes(file.type)) {
    throw new ImageValidationError(`unsupported image type: ${file.type}`, 415);
  }
}
