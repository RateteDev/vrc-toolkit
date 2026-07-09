// Image-upload + inventory query validation (spec No.24 + No.25).

// VRChat image purpose tags accepted by POST /file/image. Static tags carry no
// animation fields; the single animated tag ('emojianimated') requires them.
export type ImageTag = "icon" | "gallery" | "sticker" | "emoji" | "emojianimated";

// Animation fields, only valid (and required) when tag === 'emojianimated'.
export interface ImageAnimation {
  frames: number;
  framesOverTime: number;
  animationStyle?: string;
  loopStyle?: string;
  maskTag?: string;
}

// Input for validateImageParams (browser-side pre-flight check before upload).
export interface ImageParamsInput {
  mime: string;
  tag: string;
  frames?: number;
  framesOverTime?: number;
  animationStyle?: string;
  loopStyle?: string;
  maskTag?: string;
}

// Validated, normalized image parameters ready to drive an upload.
export interface ValidatedImageParams {
  tag: ImageTag;
  animation: ImageAnimation | null;
}

// Validate browser-side image upload parameters. Rules (spec No.24):
//   - MIME must be image/png (reject anything else).
//   - tag must be one of the known ImageTag values (reject unknown).
//   - tag === 'emojianimated': frames (2-64) and framesOverTime (1-64) are
//     required and range-checked; out-of-range (e.g. 1, 65, 0) is rejected.
//   - static tags: no animation fields are required (animation === null).
export function validateImageParams(input: ImageParamsInput): ValidatedImageParams {
  if (input.mime !== "image/png") {
    throw new Error(`image MIME must be image/png: ${input.mime}`);
  }
  const tags = ["icon", "gallery", "sticker", "emoji", "emojianimated"];
  if (tags.indexOf(input.tag) < 0) {
    throw new Error(`unknown image tag: ${input.tag}`);
  }
  if (input.tag !== "emojianimated") {
    return { tag: input.tag as ImageTag, animation: null };
  }
  if (typeof input.frames !== "number" || typeof input.framesOverTime !== "number") {
    throw new Error("emojianimated requires frames and framesOverTime");
  }
  if (input.frames < 2 || input.frames > 64) {
    throw new Error(`frames out of range (2-64): ${input.frames}`);
  }
  if (input.framesOverTime < 1 || input.framesOverTime > 64) {
    throw new Error(`framesOverTime out of range (1-64): ${input.framesOverTime}`);
  }
  const animation: ImageAnimation = {
    frames: input.frames,
    framesOverTime: input.framesOverTime,
  };
  if (input.animationStyle !== undefined) animation.animationStyle = input.animationStyle;
  if (input.loopStyle !== undefined) animation.loopStyle = input.loopStyle;
  if (input.maskTag !== undefined) animation.maskTag = input.maskTag;
  return { tag: "emojianimated", animation };
}

// UI-selectable inventory type -> the /inventory `types=` query value.
export type InventoryType = "sticker" | "emoji";

// Build the GET /inventory query for an owned inventory type. Rejects unknown
// types. Returns the value of the `types` query parameter (spec No.25).
export function inventoryQuery(type: string): string {
  if (type !== "sticker" && type !== "emoji") {
    throw new Error(`unknown inventory type: ${type}`);
  }
  return type;
}

// Raw /inventory data[] element (field names not fully confirmed; tolerant).
export interface RawInventoryItem {
  id?: string;
  itemType?: string;
  name?: string;
  created_at?: string;
  createdAt?: string;
  imageUrl?: string | null;
  [key: string]: unknown;
}

// UI-facing inventory item summary (spec No.25 data model).
export interface InventoryItemSummary {
  id: string;
  itemType: string;
  name: string;
  createdAt: string;
  imageUrl: string | null;
}

// Narrow a raw /inventory element into InventoryItemSummary, tolerant of
// missing fields (empty data / partial objects must not throw).
export function fmtInventoryItem(item: RawInventoryItem): InventoryItemSummary {
  return {
    id: item.id || "",
    itemType: item.itemType || "",
    name: item.name || "",
    createdAt: item.created_at || item.createdAt || "",
    imageUrl: item.imageUrl || null,
  };
}
