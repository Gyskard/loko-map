export type FeatureData = {
  coords: number[][];
  bbox: [number, number, number, number];
};

export type StationProperties = {
  id: string;
  nom: string;
  libellecourt: string;
  segment_drg: string;
  codeinsee: string;
  codes_uic: string;
};

export type OldStationProperties = {
  id: string;
  nom?: string;
  uic: string;
};

export type LineStats = { totalKm: number; visibleKm: number };

export type StationStats = { total: number; visible: number };

export type StatsData = {
  activeLines: LineStats;
  activeStations: StationStats;
  abandonedLines: LineStats;
  oldStations: StationStats;
};

export type SelectedStation =
  | { kind: "active"; props: StationProperties }
  | { kind: "old"; props: OldStationProperties };

export type TrainInfo = {
  label: string;
  nearStation?: string;
  flyTo: () => void;
};

export type { TrainRow, SncfData } from "@loko-map/shared";
