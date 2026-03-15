import { LAYER_TYPE, LayerConfig } from "../types/layers";

export const LAYERS = [
  {
    id: "stations",
    file: "stations.pmtiles",
    sourceLayer: "stations",
    type: LAYER_TYPE.CIRCLE,
  },
  {
    id: "lines",
    file: "lines.pmtiles",
    sourceLayer: "lines",
    type: LAYER_TYPE.LINE,
  },
] as const satisfies LayerConfig[];
