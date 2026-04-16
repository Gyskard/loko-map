export const DEG2RAD = Math.PI / 180;

// Approximate kilometers per degree of latitude (used for fast planar distance estimates).
export const KM_PER_DEG = 111;

// Returns the forward bearing in degrees from point 1 to point 2.
// Returns 0 when both points are identical (atan2(0, 0) is undefined).
export function bearingDeg(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number,
): number {
  if (lng1 === lng2 && lat1 === lat2) return 0;
  const f1 = lat1 * DEG2RAD;
  const f2 = lat2 * DEG2RAD;
  const dl = (lng2 - lng1) * DEG2RAD;
  return (
    Math.atan2(
      Math.sin(dl) * Math.cos(f2),
      Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl),
    ) *
    (180 / Math.PI)
  );
}

// Returns a point offset perpendicularly from (`lng`, `lat`) along heading `hdg`.
// Positive `distKm` offsets to the right of the heading; negative offsets to the left.
export function perpOffset(
  lng: number,
  lat: number,
  hdg: number,
  distKm: number,
): [number, number] {
  const r = (hdg + 90) * DEG2RAD;
  return [
    lng + (Math.sin(r) * distKm) / (Math.cos(lat * DEG2RAD) * KM_PER_DEG),
    lat + (Math.cos(r) * distKm) / KM_PER_DEG,
  ];
}

// Returns the axis-aligned bounding box [minLng, minLat, maxLng, maxLat] for a
// list of [lng, lat] coordinate pairs.
export function computeBbox(
  coords: number[][],
): [number, number, number, number] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLng, minLat, maxLng, maxLat];
}
