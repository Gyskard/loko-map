export const LAYER_STYLE_LINE = {
  COLOR: "line-color",
  WIDTH: "line-width",
} as const;

export const LAYER_STYLE_FILL = {
  COLOR: "fill-color",
  OPACITY: "fill-opacity",
} as const;

export const LAYER_STYLE_CIRCLE = {
  RADIUS: "circle-radius",
  COLOR: "circle-color",
} as const;

export const LAYER_KEY = {
  SOURCE_LAYER: "source-layer"
} as const;

export const LAYER_TYPE = {
  CIRCLE: "circle",
  LINE: "line",
  FILL: "fill",
  SYMBOL: "symbol",
} as const;

export type LayerType = (typeof LAYER_TYPE)[keyof typeof LAYER_TYPE];

export interface LayerConfig {
  id: string;
  file: string;
  sourceLayer: string;
  type: LayerType;
}

