import { describe, it, expect } from "vitest";
import { bearingDeg, perpOffset, computeBbox, KM_PER_DEG } from "./geo";

describe("bearingDeg", () => {
  it("returns 0 heading north", () => {
    expect(bearingDeg(0, 0, 0, 1)).toBeCloseTo(0, 3);
  });

  it("returns 90 heading east", () => {
    expect(bearingDeg(0, 0, 1, 0)).toBeCloseTo(90, 3);
  });

  it("returns 180 heading south", () => {
    expect(bearingDeg(0, 1, 0, 0)).toBeCloseTo(180, 3);
  });

  it("returns -90 heading west", () => {
    expect(bearingDeg(1, 0, 0, 0)).toBeCloseTo(-90, 3);
  });

  it("returns ~45 heading northeast", () => {
    expect(bearingDeg(0, 0, 1, 1)).toBeCloseTo(45, 0);
  });

  it("returns 0 (not NaN) when both points are identical", () => {
    const result = bearingDeg(2.3522, 48.8566, 2.3522, 48.8566);
    expect(result).toBe(0);
    expect(Number.isNaN(result)).toBe(false);
  });
});

describe("perpOffset", () => {
  it("heading north, positive offset moves east", () => {
    const [lng, lat] = perpOffset(0, 0, 0, 1);
    expect(lng).toBeGreaterThan(0);
    expect(lat).toBeCloseTo(0, 3);
  });

  it("heading north, negative offset moves west", () => {
    const [lng, lat] = perpOffset(0, 0, 0, -1);
    expect(lng).toBeLessThan(0);
    expect(lat).toBeCloseTo(0, 3);
  });

  it("heading east, positive offset moves south", () => {
    const [lng, lat] = perpOffset(0, 0, 90, 1);
    expect(lat).toBeLessThan(0);
    expect(lng).toBeCloseTo(0, 3);
  });

  it("offset of 0 returns the same point", () => {
    const [lng, lat] = perpOffset(2.3522, 48.8566, 45, 0);
    expect(lng).toBeCloseTo(2.3522, 6);
    expect(lat).toBeCloseTo(48.8566, 6);
  });

  it("offset of 1km is approximately 1/KM_PER_DEG degrees", () => {
    const [lng, lat] = perpOffset(0, 0, 0, 1);
    // heading north, right offset → moves east; at equator cosLat = 1
    expect(lat).toBeCloseTo(0, 5);
    expect(lng).toBeCloseTo(1 / KM_PER_DEG, 5);
  });
});

describe("computeBbox", () => {
  it("returns correct bbox for a simple set of coords", () => {
    const coords = [
      [1, 2],
      [3, 4],
      [0, 5],
      [2, 1],
    ];
    expect(computeBbox(coords)).toEqual([0, 1, 3, 5]);
  });

  it("returns correct bbox for a single point", () => {
    expect(computeBbox([[5, 10]])).toEqual([5, 10, 5, 10]);
  });

  it("returns infinities for empty input", () => {
    expect(computeBbox([])).toEqual([Infinity, Infinity, -Infinity, -Infinity]);
  });

  it("handles negative coordinates", () => {
    const coords = [
      [-3, -1],
      [1, 2],
      [-1, 0],
    ];
    expect(computeBbox(coords)).toEqual([-3, -1, 1, 2]);
  });
});
