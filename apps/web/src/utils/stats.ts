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
  lengthKm: number;
  coords: number[][];
};

// Get the great-circle distance between two points using Haversine formula
// Formula published in 1805 by James Andrew, if you have questions ask him, not me
export const haversineKm = (
  lng0: number,
  lat0: number,
  lng1: number,
  lat1: number,
): number => {
  const dLat = (lat1 - lat0) * DEG_TO_RAD;
  const dLng = (lng1 - lng0) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat0 * DEG_TO_RAD) *
      Math.cos(lat1 * DEG_TO_RAD) *
      Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
};

// Do computation to return data useful for line feature
export const computeLineFeature = (coords: number[][]): LineFeature => {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  let lengthKm = 0;

  // get bbox and total length in the same time
  for (let i = 0; i < coords.length; i++) {
    const coord = coords[i]!;
    const lng = coord[0]!;
    const lat = coord[1]!;

    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;

    if (i > 0) {
      const prev = coords[i - 1]!;
      lengthKm += haversineKm(prev[0]!, prev[1]!, lng, lat);
    }
  }

  return { bbox: { minLng, minLat, maxLng, maxLat }, lengthKm, coords };
};

// ---------------------------------------------------------------------------
// Viewport intersection
// ---------------------------------------------------------------------------

// Check if bounding box of camera is in the bounding box the rail line
export const bboxIntersectsRect = (
  bbox: LineBbox,
  west: number,
  south: number,
  east: number,
  north: number,
): boolean => {
  return (
    bbox.maxLng >= west &&
    bbox.minLng <= east &&
    bbox.maxLat >= south &&
    bbox.minLat <= north
  );
};

// Function to measure how much of a rail line is visible
// from the user view using the Liang–Barsky algorithm
// If you need two guys to create the algorithm,
// don't except me to explains how it works
export const clipSegment = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  west: number,
  south: number,
  east: number,
  north: number,
): [number, number, number, number] | null => {
  let t0 = 0;
  let t1 = 1;

  const dx = x1 - x0;
  const dy = y1 - y0;
  const p = [-dx, dx, -dy, dy];
  const q = [x0 - west, east - x0, y0 - south, north - y0];

  for (let i = 0; i < 4; i++) {
    const pi = p[i]!;
    const qi = q[i]!;
    if (pi === 0) {
      if (qi < 0) return null;
    } else {
      const t = qi / pi;
      if (pi < 0) {
        if (t > t0) t0 = t;
      } else if (t < t1) t1 = t;
    }
  }

  if (t0 > t1) return null;
  return [x0 + t0 * dx, y0 + t0 * dy, x0 + t1 * dx, y0 + t1 * dy];
};

// get visible km for line, used for stats
export const visibleKmForLine = (
  coords: number[][],
  west: number,
  south: number,
  east: number,
  north: number,
): number => {
  let km = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const c0 = coords[i]!;
    const c1 = coords[i + 1]!;
    const seg = clipSegment(
      c0[0]!,
      c0[1]!,
      c1[0]!,
      c1[1]!,
      west,
      south,
      east,
      north,
    );
    if (seg) km += haversineKm(seg[0]!, seg[1]!, seg[2]!, seg[3]!);
  }
  return km;
};

// get the sum of visible km
export const sumVisibleKm = (
  features: LineFeature[],
  west: number,
  south: number,
  east: number,
  north: number,
): number => {
  return features.reduce((sum, f) => {
    if (!bboxIntersectsRect(f.bbox, west, south, east, north)) return sum;
    return sum + visibleKmForLine(f.coords, west, south, east, north);
  }, 0);
};

// get total length in kilometers across all features
export const totalKm = (features: LineFeature[]): number => {
  return features.reduce((sum, f) => sum + f.lengthKm, 0);
};
