import { describe, expect, it } from "bun:test";
import { type CropItem, geom } from "./crop";

const A = 16 / 9;

describe("geom", () => {
  it("landscape image (natW/natH >= a) at zoom 1: cw==natH*a, ch==natH", () => {
    const it: CropItem = { natW: 1920, natH: 1080, zoom: 1, ncx: 0.5, ncy: 0.5 };
    const g = geom(it, A);
    expect(g.cw).toBeCloseTo(1080 * A, 6);
    expect(g.ch).toBeCloseTo(1080, 6);
    expect(g.srcX).toBeGreaterThanOrEqual(0);
    expect(g.srcX).toBeLessThanOrEqual(it.natW - g.cw + 1e-6);
    expect(g.srcY).toBeGreaterThanOrEqual(0);
    expect(g.srcY).toBeLessThanOrEqual(it.natH - g.ch + 1e-6);
  });

  it("portrait image (natW/natH < a) at zoom 1: cw==natW, ch==natW/a", () => {
    const it: CropItem = { natW: 1080, natH: 1920, zoom: 1, ncx: 0.5, ncy: 0.5 };
    const g = geom(it, A);
    expect(g.cw).toBeCloseTo(1080, 6);
    expect(g.ch).toBeCloseTo(1080 / A, 6);
    expect(g.srcX).toBeGreaterThanOrEqual(0);
    expect(g.srcX).toBeLessThanOrEqual(it.natW - g.cw + 1e-6);
    expect(g.srcY).toBeGreaterThanOrEqual(0);
    expect(g.srcY).toBeLessThanOrEqual(it.natH - g.ch + 1e-6);
  });

  it("clamps a center placed near an edge and returns the clamped ncx, without mutating input", () => {
    const it: CropItem = { natW: 1920, natH: 1080, zoom: 2, ncx: 0.0, ncy: 0.5 };
    const g = geom(it, A);
    // center was 0 but must be clamped to at least cw/2 -> returned ncx grows above 0.
    expect(g.ncx).toBeGreaterThan(0);
    expect(g.srcX).toBeCloseTo(0, 6);
    // geom is pure: the input object must be left untouched.
    expect(it.ncx).toBe(0.0);
    expect(it.ncy).toBe(0.5);
  });
});
