export type TrainRow = {
  id: string;
  line: string;
  direction: string;
  time: string;
  baseTime: string;
};

export type SncfLineInfo = { id: string; mode: string };

export type SncfData = {
  departures: TrainRow[];
  arrivals: TrainRow[];
  lines: SncfLineInfo[];
};

export type LineBbox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

export type GeoLine = {
  coords: number[][];
  lengthKm: number;
  bbox: LineBbox;
};

export type GeoStatsData = {
  lines: GeoLine[];
  oldLines: GeoLine[];
  stations: [number, number][];
  oldStations: [number, number][];
};
