import { useEffect } from "react";
import { Viewer, GeoJsonDataSource, CameraFlyTo, ImageryLayer } from "resium";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { RailTracks } from "./RailTracks";
import { StationMarkers } from "./StationMarkers";
import { StatsTracker } from "./StatsTracker";
import { SteamTrains } from "./SteamTrains";
import type {
  StatsData,
  StationProperties,
  OldStationProperties,
  TrainInfo,
} from "@/types";
import { LINE_COLOR, STATION_COLOR, INACTIVE_COLOR } from "@/constants";
import { DATA_URLS } from "@/api";
import CREDIT from "./credit.html?raw";

const imageryProvider = new Cesium.UrlTemplateImageryProvider({
  url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  subdomains: ["a", "b", "c", "d"],
  credit: CREDIT,
  maximumLevel: 19,
});

const initialDestination = Cesium.Cartesian3.fromDegrees(
  2.3522,
  46.2276,
  2_000_000,
);

// Shared style for both active and old line GeoJsonDataSources
const styleGeoJsonLines = (ds: Cesium.GeoJsonDataSource) => {
  ds.entities.values.forEach((entity) => {
    if (!entity.polyline) return;

    entity.polyline.width = new Cesium.ConstantProperty(2);

    entity.polyline.material = new Cesium.ColorMaterialProperty(
      Cesium.Color.fromCssColorString(LINE_COLOR),
    );

    entity.polyline.clampToGround = new Cesium.ConstantProperty(true);
  });
};

export const CesiumScene = ({
  showActive,
  showInactive,
  enable3D,
  onStats,
  onError,
  onStationSelect,
  onOldStationSelect,
  onTrainsReady,
  showTrains,
}: {
  showActive: boolean;
  showInactive: boolean;
  enable3D: boolean;
  onStats: (stats: StatsData) => void;
  onError: () => void;
  onStationSelect: (props: StationProperties | null) => void;
  onOldStationSelect: (props: OldStationProperties | null) => void;
  onTrainsReady: (trains: TrainInfo[]) => void;
  showTrains: boolean;
}) => {
  useEffect(() => {
    const handler = () => onError();
    imageryProvider.errorEvent.addEventListener(handler);
    return () => {
      imageryProvider.errorEvent.removeEventListener(handler);
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
      <CameraFlyTo destination={initialDestination} once />
      <ImageryLayer imageryProvider={imageryProvider} />
      <GeoJsonDataSource
        data={DATA_URLS.lines}
        clampToGround
        show={showActive}
        onLoad={styleGeoJsonLines}
        onError={onError}
      />
      <GeoJsonDataSource
        data={DATA_URLS.oldLines}
        clampToGround
        show={showInactive}
        onLoad={styleGeoJsonLines}
        onError={onError}
      />
      <RailTracks
        show={showActive}
        dataUrl={DATA_URLS.lines}
        enable3D={enable3D}
        onError={onError}
      />
      <RailTracks
        show={showInactive}
        dataUrl={DATA_URLS.oldLines}
        enable3D={enable3D}
        onError={onError}
      />
      <StationMarkers
        show={showActive}
        color={STATION_COLOR}
        dataUrl={DATA_URLS.stations}
        enable3D={enable3D}
        onSelect={onStationSelect}
        onError={onError}
      />
      <StationMarkers
        show={showInactive}
        color={INACTIVE_COLOR}
        dataUrl={DATA_URLS.oldStations}
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
      <SteamTrains
        show={showInactive && showTrains}
        enable3D={enable3D}
        onTrainsReady={onTrainsReady}
        onError={onError}
      />
    </Viewer>
  );
};
