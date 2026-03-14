import { Map as MapLibre } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

const MAP_TILER_KEY = import.meta.env.VITE_MAP_TILER_KEY;

const MAP_STYLE = `https://api.maptiler.com/maps/streets/style.json?key=${MAP_TILER_KEY}`;

const INITIAL_VIEW_STATE_ON_FRANCE = {
  longitude: 2.3522,
  latitude: 46.2276,
  zoom: 4,
};

const FRANCE_BOUNDS: [number, number, number, number] = [-7.5, 39.5, 12, 52.5];

export function Map() {
  return (
    <MapLibre
      initialViewState={INITIAL_VIEW_STATE_ON_FRANCE}
      maxBounds={FRANCE_BOUNDS}
      style={{ width: "100%", height: "100%" }}
      mapStyle={MAP_STYLE}
    />
  );
}
