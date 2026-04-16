const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_KM = 6371;

export type LineBbox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

export type LineFeature = {
  bbox: LineBbox;
  /** Total length of the feature in kilometers. */
  lengthKm: number;
  /** Raw GeoJSON coordinate array, kept for per-segment viewport clipping. */
  coords: number[][];
};

// ---------------------------------------------------------------------------
// Distance
// ---------------------------------------------------------------------------

/**
 * Haversine great-circle distance between two WGS-84 points (kilometers).
 * Accurate to within ~0.3 % for distances up to ~500 km.
 */
export function haversineKm(
  lng0: number,
  lat0: number,
  lng1: number,
  lat1: number,
): number {
  const dLat = (lat1 - lat0) * DEG_TO_RAD;
  const dLng = (lng1 - lng0) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat0 * DEG_TO_RAD) *
      Math.cos(lat1 * DEG_TO_RAD) *
      Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
}

// ---------------------------------------------------------------------------
// Feature construction
// ---------------------------------------------------------------------------

/**
 * Build a LineFeature from a raw GeoJSON coordinate array.
 * Computes the bbox and total length in a single pass.
 */
export function computeLineFeature(coords: number[][]): LineFeature {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  let lengthKm = 0;

  for (let i = 0; i < coords.length; i++) {
    const [lng, lat] = coords[i];
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
    if (i > 0)
      lengthKm += haversineKm(coords[i - 1][0], coords[i - 1][1], lng, lat);
  }

  return { bbox: { minLng, minLat, maxLng, maxLat }, lengthKm, coords };
}

// ---------------------------------------------------------------------------
// Viewport intersection
// ---------------------------------------------------------------------------

/**
 * Fast axis-aligned bounding-box check: does the feature bbox overlap the
 * camera viewport rectangle?  Used as a broad-phase filter before the more
 * expensive per-segment clipping.
 */
export function bboxIntersectsRect(
  bbox: LineBbox,
  west: number,
  south: number,
  east: number,
  north: number,
): boolean {
  return (
    bbox.maxLng >= west &&
    bbox.minLng <= east &&
    bbox.maxLat >= south &&
    bbox.minLat <= north
  );
}

/**
 * Liang-Barsky line clipping against an axis-aligned rectangle.
 *
 * Returns the clipped sub-segment [x0, y0, x1, y1] that lies inside the
 * rectangle, or null if the segment is entirely outside.
 *
 * The algorithm parameterize the segment as P(t) = P0 + t·(P1−P0) for
 * t ∈ [0,1] and iteratively narrows the [t0, t1] interval against each of
 * the four half-planes that define the rectangle.
 */
export function clipSegment(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  west: number,
  south: number,
  east: number,
  north: number,
): [number, number, number, number] | null {
  let t0 = 0;
  let t1 = 1;
  const dx = x1 - x0;
  const dy = y1 - y0;
  // p[i] < 0 → entering half-plane i; p[i] > 0 → leaving; p[i] = 0 → parallel
  const p = [-dx, dx, -dy, dy];
  const q = [x0 - west, east - x0, y0 - south, north - y0];

  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null; // parallel and outside
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t0) t0 = t; // entering — raise lower bound
      } else if (t < t1) t1 = t; // leaving — lower upper bound
    }
  }

  if (t0 > t1) return null;
  return [x0 + t0 * dx, y0 + t0 * dy, x0 + t1 * dx, y0 + t1 * dy];
}

// ---------------------------------------------------------------------------
// Visible km computation
// ---------------------------------------------------------------------------

/**
 * Sum the kilometers of a line feature that fall inside the viewport rectangle.
 * Each GeoJSON coordinate-pair segment is clipped individually so the result
 * reflects only the fraction that is actually on screen.
 */
export function visibleKmForLine(
  coords: number[][],
  west: number,
  south: number,
  east: number,
  north: number,
): number {
  let km = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const seg = clipSegment(
      coords[i][0],
      coords[i][1],
      coords[i + 1][0],
      coords[i + 1][1],
      west,
      south,
      east,
      north,
    );
    if (seg) km += haversineKm(seg[0], seg[1], seg[2], seg[3]);
  }
  return km;
}

/**
 * Sum the visible kilometers across a collection of line features.
 * The bbox pre-filter avoids per-segment work for features fully outside
 * the viewport.
 */
export function sumVisibleKm(
  features: LineFeature[],
  west: number,
  south: number,
  east: number,
  north: number,
): number {
  return features.reduce((sum, f) => {
    if (!bboxIntersectsRect(f.bbox, west, south, east, north)) return sum;
    return sum + visibleKmForLine(f.coords, west, south, east, north);
  }, 0);
}

/** Total length in kilometers across all features. */
export function totalKm(features: LineFeature[]): number {
  return features.reduce((sum, f) => sum + f.lengthKm, 0);
}
