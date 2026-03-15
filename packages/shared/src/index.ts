export const APP_NAME = "Loko Map";

export type LayerType = "circle" | "line" | "fill" | "symbol";

export interface LayerConfig {
  id: string;
  file: string;
  sourceLayer: string;
  type: LayerType;
}

export const LAYERS = [
  {
    id: "stations",
    file: "stations.pmtiles",
    sourceLayer: "stations",
    type: "circle",
  },
] as const satisfies LayerConfig[];
