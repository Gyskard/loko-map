export type {
  GeoLine as Line,
  GeoStatsData as StatsData,
} from "@loko-map/shared";

export type GeoJSONLineFeature = { geometry: { coordinates: number[][] } };

export type GeoJSONPointFeature = {
  geometry: { coordinates: [number, number] };
};

export type SncfDisplay = {
  label: string;
  commercialMode: string;
  direction: string;
};

export type SncfDeparture = {
  display_informations: SncfDisplay;
  stop_date_time: {
    departure_date_time: string;
    base_departure_date_time: string;
  };
};

export type SncfArrival = {
  display_informations: SncfDisplay;
  stop_date_time: { arrival_date_time: string; base_arrival_date_time: string };
};

export type SncfLine = { id: string; commercialMode?: { name: string } };
