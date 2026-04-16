import { describe, it, expect } from "vitest";
import {
  haversineKm,
  computeLineFeature,
  bboxIntersectsRect,
  clipSegment,
  visibleKmForLine,
  sumVisibleKm,
  totalKm,
} from "../src/utils/stats";

// ---------------------------------------------------------------------------
// haversineKm
// ---------------------------------------------------------------------------

describe("haversineKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineKm(2.3522, 48.8566, 2.3522, 48.8566)).toBe(0);
  });

  it("Paris → Lyon is approximately 392 km", () => {
    // Paris (2.3522, 48.8566) → Lyon (4.8357, 45.7640)
    expect(haversineKm(2.3522, 48.8566, 4.8357, 45.764)).toBeCloseTo(392, -1);
  });

  it("is symmetric", () => {
    const ab = haversineKm(2, 48, 5, 45);
    const ba = haversineKm(5, 45, 2, 48);
    expect(ab).toBeCloseTo(ba, 6);
  });

  it("returns a positive value for non-identical points", () => {
    expect(haversineKm(0, 0, 1, 0)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// computeLineFeature
// ---------------------------------------------------------------------------

describe("computeLineFeature", () => {
  it("computes bbox correctly", () => {
    const coords = [
      [1, 2],
      [3, 4],
      [0, 5],
      [2, 1],
    ];
    const { bbox } = computeLineFeature(coords);
    expect(bbox).toEqual({ minLng: 0, minLat: 1, maxLng: 3, maxLat: 5 });
  });

  it("computes non-zero length for a multi-point line", () => {
    const coords = [
      [2.3522, 48.8566],
      [4.8357, 45.764],
    ];
    const { lengthKm } = computeLineFeature(coords);
    expect(lengthKm).toBeCloseTo(392, -1);
  });

  it("returns zero length for a single point", () => {
    const { lengthKm } = computeLineFeature([[0, 0]]);
    expect(lengthKm).toBe(0);
  });

  it("stores the original coords reference", () => {
    const coords = [
      [0, 0],
      [1, 1],
    ];
    expect(computeLineFeature(coords).coords).toBe(coords);
  });
});

// ---------------------------------------------------------------------------
// bboxIntersectsRect
// ---------------------------------------------------------------------------

describe("bboxIntersectsRect", () => {
  const bbox = { minLng: 1, minLat: 1, maxLng: 3, maxLat: 3 };

  it("returns true when bbox is fully inside rect", () => {
    expect(bboxIntersectsRect(bbox, 0, 0, 4, 4)).toBe(true);
  });

  it("returns true when rect is fully inside bbox", () => {
    expect(bboxIntersectsRect(bbox, 1.5, 1.5, 2.5, 2.5)).toBe(true);
  });

  it("returns true when bbox partially overlaps rect", () => {
    expect(bboxIntersectsRect(bbox, 2, 2, 5, 5)).toBe(true);
  });

  it("returns true when bbox touches rect edge exactly", () => {
    expect(bboxIntersectsRect(bbox, 3, 3, 5, 5)).toBe(true);
  });

  it("returns false when bbox is entirely to the left", () => {
    expect(bboxIntersectsRect(bbox, 4, 0, 6, 4)).toBe(false);
  });

  it("returns false when bbox is entirely to the right", () => {
    expect(bboxIntersectsRect(bbox, -3, 0, 0, 4)).toBe(false);
  });

  it("returns false when bbox is entirely above", () => {
    expect(bboxIntersectsRect(bbox, 0, 4, 4, 6)).toBe(false);
  });

  it("returns false when bbox is entirely below", () => {
    expect(bboxIntersectsRect(bbox, 0, -3, 4, 0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// clipSegment
// ---------------------------------------------------------------------------

describe("clipSegment", () => {
  // rect: x ∈ [0,4], y ∈ [0,4]
  const R = { w: 0, s: 0, e: 4, n: 4 } as const;
  const clip = (x0: number, y0: number, x1: number, y1: number) =>
    clipSegment(x0, y0, x1, y1, R.w, R.s, R.e, R.n);

  it("returns full segment when entirely inside", () => {
    expect(clip(1, 1, 3, 3)).toEqual([1, 1, 3, 3]);
  });

  it("returns null when entirely outside (left)", () => {
    expect(clip(-3, 1, -1, 3)).toBeNull();
  });

  it("returns null when entirely outside (above)", () => {
    expect(clip(1, 5, 3, 7)).toBeNull();
  });

  it("clips a segment entering from the left", () => {
    const seg = clip(-2, 2, 2, 2);
    expect(seg).not.toBeNull();
    expect(seg![0]).toBeCloseTo(0, 5); // clipped x0 = west boundary
    expect(seg![1]).toBeCloseTo(2, 5);
    expect(seg![2]).toBeCloseTo(2, 5);
    expect(seg![3]).toBeCloseTo(2, 5);
  });

  it("clips a diagonal segment crossing the rect", () => {
    // segment from (-1,-1) to (5,5) — enters at (0,0), exits at (4,4)
    const seg = clip(-1, -1, 5, 5);
    expect(seg).not.toBeNull();
    expect(seg![0]).toBeCloseTo(0, 5);
    expect(seg![1]).toBeCloseTo(0, 5);
    expect(seg![2]).toBeCloseTo(4, 5);
    expect(seg![3]).toBeCloseTo(4, 5);
  });

  it("returns null when segment passes along an edge but outside", () => {
    // y = -1, horizontal — parallel to bottom edge and below it
    expect(clip(-2, -1, 6, -1)).toBeNull();
  });

  it("handles a zero-length segment inside", () => {
    expect(clip(2, 2, 2, 2)).toEqual([2, 2, 2, 2]);
  });
});

// ---------------------------------------------------------------------------
// visibleKmForLine
// ---------------------------------------------------------------------------

describe("visibleKmForLine", () => {
  it("returns full line length when fully inside viewport", () => {
    const coords = [
      [1, 1],
      [3, 1],
    ];
    const full = haversineKm(1, 1, 3, 1);
    expect(visibleKmForLine(coords, 0, 0, 4, 4)).toBeCloseTo(full, 4);
  });

  it("returns 0 when line is entirely outside viewport", () => {
    const coords = [
      [10, 10],
      [12, 10],
    ];
    expect(visibleKmForLine(coords, 0, 0, 4, 4)).toBe(0);
  });

  it("returns roughly half the length when only half is inside", () => {
    // horizontal segment from lng=0 to lng=4 at lat=1; viewport covers [0,4] in x but only [0,2] in y → full segment inside
    // Instead: segment lng 0→4, lat 1; viewport [0,2] in lng
    const coords = [
      [0, 1],
      [4, 1],
    ];
    const half = haversineKm(0, 1, 2, 1);
    const result = visibleKmForLine(coords, 0, 0, 2, 2);
    expect(result).toBeCloseTo(half, 2);
  });

  it("returns 0 for a single-point line (no segments)", () => {
    expect(visibleKmForLine([[1, 1]], 0, 0, 4, 4)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// sumVisibleKm / totalKm
// ---------------------------------------------------------------------------

describe("totalKm", () => {
  it("sums lengthKm across all features", () => {
    const f1 = computeLineFeature([
      [0, 0],
      [1, 0],
    ]);
    const f2 = computeLineFeature([
      [2, 0],
      [3, 0],
    ]);
    expect(totalKm([f1, f2])).toBeCloseTo(f1.lengthKm + f2.lengthKm, 6);
  });

  it("returns 0 for empty array", () => {
    expect(totalKm([])).toBe(0);
  });
});

describe("sumVisibleKm", () => {
  it("skips features whose bbox is outside the viewport", () => {
    const outside = computeLineFeature([
      [10, 10],
      [11, 10],
    ]);
    expect(sumVisibleKm([outside], 0, 0, 4, 4)).toBe(0);
  });

  it("counts fully visible features", () => {
    const inside = computeLineFeature([
      [1, 1],
      [2, 1],
    ]);
    expect(sumVisibleKm([inside], 0, 0, 4, 4)).toBeCloseTo(inside.lengthKm, 4);
  });

  it("partially counts a feature that crosses the viewport boundary", () => {
    const crossing = computeLineFeature([
      [0, 1],
      [4, 1],
    ]);
    const halfVp = sumVisibleKm([crossing], 0, 0, 2, 2);
    const fullVp = sumVisibleKm([crossing], 0, 0, 4, 2);
    expect(halfVp).toBeLessThan(fullVp);
    expect(halfVp).toBeGreaterThan(0);
  });

  it("returns 0 for empty array", () => {
    expect(sumVisibleKm([], 0, 0, 4, 4)).toBe(0);
  });
});
