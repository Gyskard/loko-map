import { useEffect, useRef } from "react";
import { Map as MapLibre, useMap } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";

const MAP_TILER_KEY = import.meta.env.VITE_MAP_TILER_KEY;

const MAP_STYLE = `https://api.maptiler.com/maps/streets/style.json?key=${MAP_TILER_KEY}`;

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

      m.addSource("stations", {
        type: "vector",
        url: "pmtiles:///data/stations.pmtiles",
      });

      m.addLayer({
        id: "stations",
        type: "circle",
        source: "stations",
        "source-layer": "stations",
        paint: {
          "circle-radius": 4,
          "circle-color": "#e63946",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#fff",
        },
      });
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
      mapStyle={MAP_STYLE}
    >
      <Layers />
    </MapLibre>
  );
}
