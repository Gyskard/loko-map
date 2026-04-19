import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";
import type {
  StatsData,
  Line,
  GeoJSONLineFeature,
  GeoJSONPointFeature,
} from "./types.js";

const directoryName = dirname(fileURLToPath(import.meta.url));
const geojsonDirectory = join(directoryName, "../data/geojson");

// Get great-circle distance between 2 points by using Haversine formula
// If you ask me how it works, I will cry
const haversineKm = (
  lng0: number,
  lat0: number,
  lng1: number,
  lat1: number,
): number => {
  const R = 6371;
  const DEG = Math.PI / 180;
  const dLat = (lat1 - lat0) * DEG;
  const dLng = (lng1 - lng0) * DEG;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat0 * DEG) * Math.cos(lat1 * DEG) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.asin(Math.sqrt(a));
};

// For each GeoJSON line feature, use its coordinates once to compute the total great-circle
// and bbox the axis-aligned bounding box and the total great-circle length in km
const processLines = (features: GeoJSONLineFeature[]): Line[] =>
  features.map((f) => {
    const coords = f.geometry.coordinates;

    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    let lengthKm = 0;

    for (let i = 0; i < coords.length; i++) {
      const coord = coords[i]!;
      const lng = coord[0]!;
      const lat = coord[1]!;

      // Expand the bbox to include this point
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;

      // Accumulate segment length from the previous point to this one
      if (i > 0) {
        const prev = coords[i - 1]!;
        lengthKm += haversineKm(prev[0]!, prev[1]!, lng, lat);
      }
    }

    return { coords, lengthKm, bbox: { minLng, minLat, maxLng, maxLat } };
  });

// Flatten points for the clients
const processPoints = (features: GeoJSONPointFeature[]): [number, number][] =>
  features.map((f) => [f.geometry.coordinates[0], f.geometry.coordinates[1]]);

// Load the stats data just once when server start and give it the user when asked
// Because all data are not loaded in the front, only what's needed for the current view of user
// So he can't do the stats himself, that's sad
export const loadStatsData = async (): Promise<StatsData> => {
  const [linesRaw, oldLinesRaw, stationsRaw, oldStationsRaw] =
    await Promise.all([
      readFile(join(geojsonDirectory, "lines.geojson"), "utf-8").then(
        JSON.parse,
      ),
      readFile(join(geojsonDirectory, "old_lines.geojson"), "utf-8").then(
        JSON.parse,
      ),
      readFile(join(geojsonDirectory, "stations.geojson"), "utf-8").then(
        JSON.parse,
      ),
      readFile(join(geojsonDirectory, "old_stations.geojson"), "utf-8").then(
        JSON.parse,
      ),
    ]);

  return {
    lines: processLines(linesRaw.features),
    oldLines: processLines(oldLinesRaw.features),
    stations: processPoints(stationsRaw.features),
    oldStations: processPoints(oldStationsRaw.features),
  };
};
