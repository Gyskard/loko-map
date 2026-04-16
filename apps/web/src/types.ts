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
