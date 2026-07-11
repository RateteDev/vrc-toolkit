// Unit tests for the images / inventory pure helpers (spec No.24 + No.25):
//   - validateImageParams: emojianimated requires frames/framesOverTime and
//     range-checks them (reject 1, 65, 0); static tags need no animation
//     fields; unknown tag rejected; non-PNG MIME rejected.
//   - inventoryQuery: sticker/emoji query generation; unknown type rejected.
//   - fmtInventoryItem: tolerant of empty data / missing fields.

import { describe, expect, it } from "bun:test";
import type { VRChatFile } from "../types";
import {
  fmtInventoryItem,
  type ImageParamsInput,
  inventoryQuery,
  latestFileUrl,
  validateImageParams,
} from "./images";

const base = (over: Partial<ImageParamsInput>): ImageParamsInput => ({
  mime: "image/png",
  tag: "sticker",
  ...over,
});

describe("validateImageParams", () => {
  it("accepts a static PNG sticker with no animation fields", () => {
    const out = validateImageParams(base({ tag: "sticker" }));
    expect(out.tag).toBe("sticker");
    expect(out.animation).toBeNull();
  });

  it("accepts a static PNG emoji with no animation fields", () => {
    const out = validateImageParams(base({ tag: "emoji" }));
    expect(out.tag).toBe("emoji");
    expect(out.animation).toBeNull();
  });

  it("accepts other static tags (icon, gallery) with no animation", () => {
    expect(validateImageParams(base({ tag: "icon" })).animation).toBeNull();
    expect(validateImageParams(base({ tag: "gallery" })).animation).toBeNull();
  });

  it("ignores stray animation fields on a static tag (animation stays null)", () => {
    const out = validateImageParams(base({ tag: "sticker", frames: 4, framesOverTime: 4 }));
    expect(out.animation).toBeNull();
  });

  it("accepts emojianimated with in-range frames/framesOverTime", () => {
    const out = validateImageParams(base({ tag: "emojianimated", frames: 4, framesOverTime: 2 }));
    expect(out.tag).toBe("emojianimated");
    expect(out.animation).not.toBeNull();
    expect(out.animation?.frames).toBe(4);
    expect(out.animation?.framesOverTime).toBe(2);
  });

  it("accepts emojianimated at the range boundaries (frames=2/64, framesOverTime=1/64)", () => {
    expect(
      validateImageParams(base({ tag: "emojianimated", frames: 2, framesOverTime: 1 })).animation
        ?.frames,
    ).toBe(2);
    expect(
      validateImageParams(base({ tag: "emojianimated", frames: 64, framesOverTime: 64 })).animation
        ?.frames,
    ).toBe(64);
  });

  it("rejects emojianimated when frames is missing", () => {
    expect(() => validateImageParams(base({ tag: "emojianimated", framesOverTime: 4 }))).toThrow();
  });

  it("rejects emojianimated when framesOverTime is missing", () => {
    expect(() => validateImageParams(base({ tag: "emojianimated", frames: 4 }))).toThrow();
  });

  it("rejects emojianimated with frames below range (1)", () => {
    expect(() =>
      validateImageParams(base({ tag: "emojianimated", frames: 1, framesOverTime: 1 })),
    ).toThrow();
  });

  it("rejects emojianimated with frames above range (65)", () => {
    expect(() =>
      validateImageParams(base({ tag: "emojianimated", frames: 65, framesOverTime: 1 })),
    ).toThrow();
  });

  it("rejects emojianimated with framesOverTime below range (0)", () => {
    expect(() =>
      validateImageParams(base({ tag: "emojianimated", frames: 4, framesOverTime: 0 })),
    ).toThrow();
  });

  it("rejects emojianimated with framesOverTime above range (65)", () => {
    expect(() =>
      validateImageParams(base({ tag: "emojianimated", frames: 4, framesOverTime: 65 })),
    ).toThrow();
  });

  it("rejects an unknown tag", () => {
    expect(() => validateImageParams(base({ tag: "bogus" }))).toThrow();
  });

  it("rejects a non-PNG MIME (image/jpeg)", () => {
    expect(() => validateImageParams(base({ mime: "image/jpeg", tag: "sticker" }))).toThrow();
  });

  it("rejects a non-PNG MIME (image/gif) even for an animated tag", () => {
    expect(() =>
      validateImageParams(
        base({
          mime: "image/gif",
          tag: "emojianimated",
          frames: 4,
          framesOverTime: 4,
        }),
      ),
    ).toThrow();
  });
});

describe("inventoryQuery", () => {
  it("builds the sticker query", () => {
    expect(inventoryQuery("sticker")).toBe("sticker");
  });

  it("builds the emoji query", () => {
    expect(inventoryQuery("emoji")).toBe("emoji");
  });

  it("rejects an unknown type", () => {
    expect(() => inventoryQuery("avatar")).toThrow();
  });
});

describe("fmtInventoryItem", () => {
  it("maps a full item", () => {
    const out = fmtInventoryItem({
      id: "inv_1",
      itemType: "sticker",
      name: "Hello",
      created_at: "2024-05-01T00:00:00.000Z",
      imageUrl: "https://example.com/a.png",
    });
    expect(out).toEqual({
      id: "inv_1",
      itemType: "sticker",
      name: "Hello",
      createdAt: "2024-05-01T00:00:00.000Z",
      imageUrl: "https://example.com/a.png",
    });
  });

  it("tolerates an empty object (all fields missing)", () => {
    const out = fmtInventoryItem({});
    expect(out.id).toBe("");
    expect(out.itemType).toBe("");
    expect(out.name).toBe("");
    expect(out.createdAt).toBe("");
    expect(out.imageUrl).toBeNull();
  });

  it("tolerates a partial item (some fields missing)", () => {
    const out = fmtInventoryItem({ id: "inv_2", name: "Partial" });
    expect(out.id).toBe("inv_2");
    expect(out.name).toBe("Partial");
    expect(out.itemType).toBe("");
    expect(out.createdAt).toBe("");
    expect(out.imageUrl).toBeNull();
  });
});

describe("latestFileUrl", () => {
  it("returns the last version's file.url", () => {
    const file: VRChatFile = {
      id: "file_1",
      versions: [{ file: { url: "https://x/v0" } }, { file: { url: "https://x/v1" } }],
    };
    expect(latestFileUrl(file)).toBe("https://x/v1");
  });

  it("returns null when versions is empty", () => {
    expect(latestFileUrl({ id: "file_1", versions: [] })).toBeNull();
  });

  it("returns null when versions is missing", () => {
    expect(latestFileUrl({ id: "file_1" })).toBeNull();
  });

  it("returns null when the last version has no file", () => {
    expect(latestFileUrl({ versions: [{ file: { url: "https://x/v0" } }, {}] })).toBeNull();
  });

  it("returns null when the last version's file has no url", () => {
    expect(latestFileUrl({ versions: [{ file: {} }] })).toBeNull();
  });
});
