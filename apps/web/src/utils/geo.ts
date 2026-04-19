export const DEG2RAD = Math.PI / 180; // I don't like math
import { KM_PER_DEG } from "@/constants";
export { KM_PER_DEG };

// Get the forward bearing in degrees from point 1 to point 2 using forward azimuth formula
// I feel smart when I wrote the comment above but don't ask me how it works please
export const bearingDeg = (
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number,
): number => {
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
};

// To move sideways from a point, left or right depending of the faced direction
export const perpOffset = (
  lng: number,
  lat: number,
  hdg: number,
  distKm: number,
): [number, number] => {
  const r = (hdg + 90) * DEG2RAD;

  return [
    lng + (Math.sin(r) * distKm) / (Math.cos(lat * DEG2RAD) * KM_PER_DEG),
    lat + (Math.cos(r) * distKm) / KM_PER_DEG,
  ];
};

// Get the bbox corresponding to the coords
export const computeBbox = (
  coords: number[][],
): [number, number, number, number] => {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const coord of coords) {
    const lng = coord[0]!;
    const lat = coord[1]!;

    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }

  return [minLng, minLat, maxLng, maxLat];
};
