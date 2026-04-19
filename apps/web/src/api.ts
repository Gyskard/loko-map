export const DATA_URLS = {
  lines: "/api/data/geojson/lines.geojson",
  oldLines: "/api/data/geojson/old_lines.geojson",
  stations: "/api/data/geojson/stations.geojson",
  oldStations: "/api/data/geojson/old_stations.geojson",
  stats: "/api/stats",
  locomotiveModel: "/api/data/models/locomotive.glb",
  sncfStation: (uic: string) => `/api/sncf/station/${uic}`,
} as const;
