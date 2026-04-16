import { LAYER_TYPE, LayerConfig } from "../types/layers.js";

export const LAYERS = [
  {
    id: "stations",
    file: "stations.geojson",
    sourceLayer: "stations",
    type: LAYER_TYPE.CIRCLE,
  },
  {
    id: "lines",
    file: "lines.geojson",
    sourceLayer: "lines",
    type: LAYER_TYPE.LINE,
  },
] as const satisfies LayerConfig[];
