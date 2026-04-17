import { useEffect } from "react";
import { Viewer, GeoJsonDataSource, CameraFlyTo, ImageryLayer } from "resium";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { RailTracks } from "./RailTracks";
import { StationMarkers } from "./StationMarkers";
import { StatsTracker } from "./StatsTracker";
import type {
  StatsData,
  StationProperties,
  OldStationProperties,
} from "@/types";

const topoImageryProvider = new Cesium.UrlTemplateImageryProvider({
  url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  subdomains: ["a", "b", "c", "d"],
  credit: "© OpenStreetMap contributors © CARTO",
  maximumLevel: 19,
});

const INITIAL_DESTINATION = Cesium.Cartesian3.fromDegrees(
  2.3522,
  46.2276,
  2_000_000,
);

// Shared style for both active and abandoned line GeoJsonDataSources.
// Active and abandoned lines use the same visual appearance (gray track colour);
// their distinction is handled by show/hide, not colour.
function styleGeoJsonLines(ds: Cesium.GeoJsonDataSource) {
  ds.entities.values.forEach((entity) => {
    if (!entity.polyline) return;
    entity.polyline.width = new Cesium.ConstantProperty(2);
    entity.polyline.material = new Cesium.ColorMaterialProperty(
      Cesium.Color.fromCssColorString("#7a6a5a"),
    );
    entity.polyline.clampToGround = new Cesium.ConstantProperty(true);
  });
}

type Props = {
  showActive: boolean;
  showInactive: boolean;
  enable3D: boolean;
  onStats: (stats: StatsData) => void;
  onError: () => void;
  onStationSelect: (props: StationProperties | null) => void;
  onOldStationSelect: (props: OldStationProperties | null) => void;
};

export function CesiumScene({
  showActive,
  showInactive,
  enable3D,
  onStats,
  onError,
  onStationSelect,
  onOldStationSelect,
}: Props) {
  useEffect(() => {
    const handler = () => onError();
    topoImageryProvider.errorEvent.addEventListener(handler);
    return () => {
      topoImageryProvider.errorEvent.removeEventListener(handler);
    };
  }, [onError]);

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
      fullscreenButton={false}
      sceneModePicker={false}
      baseLayer={false}
    >
      <CameraFlyTo destination={INITIAL_DESTINATION} once />
      <ImageryLayer imageryProvider={topoImageryProvider} />
      <GeoJsonDataSource
        data="/api/data/lines.geojson"
        clampToGround
        show={showActive}
        onLoad={styleGeoJsonLines}
        onError={onError}
      />
      <GeoJsonDataSource
        data="/api/data/old_lines.geojson"
        clampToGround
        show={showInactive}
        onLoad={styleGeoJsonLines}
        onError={onError}
      />
      <RailTracks
        show={showActive}
        dataUrl="/api/data/lines.geojson"
        enable3D={enable3D}
        onError={onError}
      />
      <RailTracks
        show={showInactive}
        dataUrl="/api/data/old_lines.geojson"
        enable3D={enable3D}
        onError={onError}
      />
      <StationMarkers
        show={showActive}
        color="#e63946"
        dataUrl="/api/data/stations.geojson"
        enable3D={enable3D}
        onSelect={onStationSelect}
        onError={onError}
      />
      <StationMarkers
        show={showInactive}
        color="#3b82f6"
        dataUrl="/api/data/old_stations.geojson"
        enable3D={enable3D}
        onSelect={onOldStationSelect}
        onError={onError}
      />
      <StatsTracker
        showActive={showActive}
        showInactive={showInactive}
        onStats={onStats}
        onError={onError}
      />
    </Viewer>
  );
}
