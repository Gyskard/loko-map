export const DEG2RAD = Math.PI / 180;

// Approximate km per degree (used for fast planar distance estimates)
export const KM_PER_DEG = 111;

// Forward bearing in degrees from point 1 → point 2
export function bearingDeg(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number,
): number {
  const f1 = lat1 * DEG2RAD,
    f2 = lat2 * DEG2RAD;
  const dl = (lng2 - lng1) * DEG2RAD;
  return (
    Math.atan2(
      Math.sin(dl) * Math.cos(f2),
      Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl),
    ) *
    (180 / Math.PI)
  );
}

// Offset a point perpendicular to `hdg` by `distKm`.
// Positive distKm → right of heading, negative → left.
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

export function computeBbox(
  coords: number[][],
): [number, number, number, number] {
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLng, minLat, maxLng, maxLat];
}
