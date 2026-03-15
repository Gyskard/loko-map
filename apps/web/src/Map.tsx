import { useEffect, useRef } from "react";
import { Map as MapLibre, useMap } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";
import { LAYER_KEY, LAYER_STYLE_CIRCLE, LAYER_STYLE_LINE, LAYERS, LAYER_TYPE, SOURCE_TYPE } from "@loko-map/shared";

const MAP_TILER_KEY = import.meta.env.VITE_MAP_TILER_KEY;

const MAP_STYLE_URL = `https://api.maptiler.com/maps/streets/style.json?key=${MAP_TILER_KEY}`;

const TILES_URL = "pmtiles:///api/data";

const INITIAL_VIEW_STATE_ON_FRANCE = {
  longitude: 2.3522,
  latitude: 46.2276,
  zoom: 4,
};

const FRANCE_BOUNDS: [number, number, number, number] = [-7.5, 39.5, 12, 52.5];

const protocol = new Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);

function Layers() {
  const { current: map } = useMap();
  const added = useRef(false);

  useEffect(() => {
    if (!map || added.current) return;

    const m = map.getMap();

    const addLayers = () => {
      if (added.current) return;
      added.current = true;

      for (const { id, file, sourceLayer, type } of LAYERS) {
        m.addSource(id, {
          type: SOURCE_TYPE.VECTOR,
          url: `${TILES_URL}/${file}`,
        });

        if (type === LAYER_TYPE.CIRCLE) {
          m.addLayer({
            id,
            type,
            source: id,
            [LAYER_KEY.SOURCE_LAYER]: sourceLayer,
            paint: {
              [LAYER_STYLE_CIRCLE.RADIUS]: 4,
              [LAYER_STYLE_CIRCLE.COLOR]: "#e63946",
            },
          });
        } else if (type === LAYER_TYPE.LINE) {
          m.addLayer({
            id,
            type,
            source: id,
            [LAYER_KEY.SOURCE_LAYER]: sourceLayer,
            paint: {
              [LAYER_STYLE_LINE.COLOR]: "#e63946",
            },
          });
        }
      }
    };

    if (m.isStyleLoaded()) {
      addLayers();
    } else {
      m.once("load", addLayers);
    }
  }, [map]);

  return null;
}

export function Map() {
  return (
    <MapLibre
      initialViewState={INITIAL_VIEW_STATE_ON_FRANCE}
      maxBounds={FRANCE_BOUNDS}
      style={{ width: "100%", height: "100%" }}
      mapStyle={MAP_STYLE_URL}
    >
      <Layers />
    </MapLibre>
  );
}
