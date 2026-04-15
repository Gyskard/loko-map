import { Viewer, GeoJsonDataSource, CameraFlyTo, ImageryLayer } from "resium";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { RailTracks } from "./RailTracks";

const topoImageryProvider = new Cesium.UrlTemplateImageryProvider({
  url: `https://api.maptiler.com/maps/topo-v2/{z}/{x}/{y}.webp?key=${import.meta.env.VITE_MAP_TILER_KEY}`,
  credit: "MapTiler",
});

const INITIAL_DESTINATION = Cesium.Cartesian3.fromDegrees(
  2.3522,
  46.2276,
  900_000,
);

// Matches the ballast bed color in RailTracks for a seamless LOD transition
const LINE_COLOR = "#7a6a5a";
const STATION_COLOR = "#e63946";

function styleLines(ds: Cesium.GeoJsonDataSource) {
  ds.entities.values.forEach((entity) => {
    if (entity.polyline) {
      entity.polyline.width = new Cesium.ConstantProperty(2);
      entity.polyline.material = new Cesium.ColorMaterialProperty(
        Cesium.Color.fromCssColorString(LINE_COLOR),
      );
      entity.polyline.clampToGround = new Cesium.ConstantProperty(true);
    }
  });
}

function styleStations(ds: Cesium.GeoJsonDataSource) {
  ds.entities.values.forEach((entity) => {
    entity.billboard = undefined;
    entity.point = new Cesium.PointGraphics({
      color: Cesium.Color.fromCssColorString(STATION_COLOR),
      pixelSize: 6,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 1,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    });
  });
}

export function MapViewer() {
  return (
    <Viewer
      full
      timeline={false}
      animation={false}
      homeButton={false}
      baseLayerPicker={false}
      navigationHelpButton={false}
      geocoder={false}
      infoBox={false}
      selectionIndicator={false}
    >
      <CameraFlyTo destination={INITIAL_DESTINATION} once />
      <ImageryLayer imageryProvider={topoImageryProvider} />
      <GeoJsonDataSource
        data="/api/data/lines.geojson"
        clampToGround
        onLoad={styleLines}
      />
      <GeoJsonDataSource
        data="/api/data/stations.geojson"
        onLoad={styleStations}
      />
      <RailTracks />
    </Viewer>
  );
}
