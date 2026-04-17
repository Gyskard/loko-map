import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Viewer, GeoJsonDataSource, CameraFlyTo, ImageryLayer } from "resium";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { RailTracks } from "./RailTracks";
import { StationMarkers } from "./StationMarkers";
import { StatsTracker } from "./StatsTracker";
import { Toggle } from "./Toggle";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import type { StatsData } from "./StatsTracker";
import type { StationProperties, OldStationProperties } from "@/types";

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

const LINE_COLOR = "#7a6a5a";
const STATION_COLOR = "#e63946";
const INACTIVE_COLOR = "#3b82f6";

// Shared style for both active and abandoned line GeoJsonDataSources.
// Active and abandoned lines use the same visual appearance (gray track colour);
// their distinction is handled by show/hide, not colour.
function styleGeoJsonLines(ds: Cesium.GeoJsonDataSource) {
  ds.entities.values.forEach((entity) => {
    if (!entity.polyline) return;
    entity.polyline.width = new Cesium.ConstantProperty(2);
    entity.polyline.material = new Cesium.ColorMaterialProperty(
      Cesium.Color.fromCssColorString(LINE_COLOR),
    );
    entity.polyline.clampToGround = new Cesium.ConstantProperty(true);
  });
}

function ControlPanel({
  showActive,
  showInactive,
  onToggleActive,
  onToggleInactive,
  showStats,
  onToggleStats,
  enable3D,
  onToggle3D,
}: {
  showActive: boolean;
  showInactive: boolean;
  onToggleActive: () => void;
  onToggleInactive: () => void;
  showStats: boolean;
  onToggleStats: () => void;
  enable3D: boolean;
  onToggle3D: () => void;
}) {
  const { t, i18n } = useTranslation();
  return (
    <div className="fixed left-4 top-4 z-50 w-70 rounded-xl bg-white shadow-xl">
      <div className="border-b border-gray-100 px-4 py-3">
        <h1 className="text-sm font-bold tracking-wide text-gray-900">
          {t("app.name")}
        </h1>
      </div>
      <div className="border-b border-gray-100 px-4 py-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
          {t("control.section")}
        </p>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: STATION_COLOR }}
              />
              <span className="text-sm text-gray-700">
                {t("control.active")}
              </span>
            </div>
            <Toggle enabled={showActive} onToggle={onToggleActive} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: INACTIVE_COLOR }}
              />
              <span className="text-sm text-gray-700">
                {t("control.inactive")}
              </span>
            </div>
            <Toggle enabled={showInactive} onToggle={onToggleInactive} />
          </div>
        </div>
      </div>
      <div className="px-4 py-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
          {t("settings.title")}
        </p>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">
              {t("settings.showStats")}
            </span>
            <Toggle enabled={showStats} onToggle={onToggleStats} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">
              {t("settings.enable3D")}
            </span>
            <Toggle enabled={enable3D} onToggle={onToggle3D} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">
              {t("settings.language")}
            </span>
            <div className="flex rounded-lg border border-gray-200 text-xs font-medium">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => i18n.changeLanguage(lang)}
                  className={`px-2.5 py-1 transition-colors first:rounded-l-lg last:rounded-r-lg ${
                    i18n.language === lang
                      ? "bg-gray-800 text-white"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type StatRow =
  | {
      kind: "km";
      dot: string;
      label: string;
      visibleKm: number;
      totalKm: number;
    }
  | {
      kind: "count";
      dot: string;
      label: string;
      visible: number;
      total: number;
    };

function fmtKm(km: number) {
  return `${km.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} km`;
}

function StatsPanel({
  stats,
  showActive,
  showInactive,
}: {
  stats: StatsData | null;
  showActive: boolean;
  showInactive: boolean;
}) {
  const { t, i18n } = useTranslation();
  const rows: StatRow[] = [];

  if (stats && (showActive || showInactive)) {
    const visibleKm =
      (showActive ? stats.activeLines.visibleKm : 0) +
      (showInactive ? stats.abandonedLines.visibleKm : 0);
    const totalKm =
      (showActive ? stats.activeLines.totalKm : 0) +
      (showInactive ? stats.abandonedLines.totalKm : 0);
    rows.push({
      kind: "km",
      dot: LINE_COLOR,
      label: t("stats.lines"),
      visibleKm,
      totalKm,
    });
  }
  if (showActive && stats) {
    rows.push({
      kind: "count",
      dot: STATION_COLOR,
      label: t("stats.activeStations"),
      ...stats.activeStations,
    });
  }
  if (showInactive && stats) {
    rows.push({
      kind: "count",
      dot: INACTIVE_COLOR,
      label: t("stats.oldStations"),
      ...stats.oldStations,
    });
  }

  return (
    <div className="fixed right-4 top-4 z-50 w-90 rounded-xl bg-white shadow-xl">
      <div className="border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-bold tracking-wide text-gray-900">
          {t("stats.title")}
        </h2>
      </div>
      <div className="px-4 py-3">
        {rows.length === 0 ? (
          <p className="text-xs italic text-gray-400">{t("stats.noData")}</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: row.dot }}
                />
                <span className="text-xs text-gray-700">{row.label}</span>
                <span className="ml-auto whitespace-nowrap font-mono text-xs text-gray-500">
                  {row.kind === "km"
                    ? t("stats.visibleOfKm", {
                        visible: fmtKm(row.visibleKm),
                        total: fmtKm(row.totalKm),
                      })
                    : t("stats.visibleOfCount", {
                        visible: row.visible.toLocaleString(i18n.language),
                        total: row.total.toLocaleString(i18n.language),
                      })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type SelectedStation =
  | { kind: "active"; props: StationProperties }
  | { kind: "old"; props: OldStationProperties };

// Module-level factory — avoids duplicating the select/deselect logic for
// each station kind. Safe to pass `setter` directly since useState setters
// are stable across renders.
function makeSelectHandler<T>(
  kind: SelectedStation["kind"],
  setter: React.Dispatch<React.SetStateAction<SelectedStation | null>>,
) {
  return (props: T | null) => {
    if (props) {
      setter({ kind, props } as unknown as SelectedStation);
    } else {
      setter((prev) => (prev?.kind === kind ? null : prev));
    }
  };
}

function StationPopup({
  selected,
  onClose,
}: {
  selected: SelectedStation;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { props } = selected;

  return (
    <div className="fixed bottom-8 left-4 z-10 w-64 rounded-xl bg-white p-4 shadow-2xl">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h2 className="font-bold leading-tight text-gray-900">
            {selected.kind === "old" ? (props.nom ?? props.id) : props.nom}
          </h2>
          {selected.kind === "active" && (
            <span className="font-mono text-xs text-gray-400">
              {selected.props.libellecourt}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-3 mt-0.5 text-lg leading-none text-gray-400 hover:text-gray-700"
        >
          ×
        </button>
      </div>
      <div className="space-y-1.5 border-t border-gray-100 pt-2 text-sm">
        {selected.kind === "active" ? (
          <>
            <div className="flex justify-between">
              <span className="text-gray-400">{t("popup.segment")}</span>
              <span className="font-medium text-gray-700">
                {selected.props.segment_drg}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t("popup.uic")}</span>
              <span className="font-mono text-gray-700">
                {selected.props.codes_uic}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t("popup.insee")}</span>
              <span className="font-mono text-gray-700">
                {selected.props.codeinsee}
              </span>
            </div>
          </>
        ) : (
          <div className="flex justify-between">
            <span className="text-gray-400">{t("popup.uic")}</span>
            <span className="font-mono text-gray-700">
              {selected.props.uic}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function MapViewer() {
  const [showActive, setShowActive] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedStation, setSelectedStation] =
    useState<SelectedStation | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [showStats, setShowStats] = useState(true);
  const [enable3D, setEnable3D] = useState(true);

  // StationMarkers stores these in a ref, so new function instances on each
  // render are harmless — useCallback would add noise without any benefit.
  const handleStationSelect = makeSelectHandler<StationProperties>(
    "active",
    setSelectedStation,
  );
  const handleOldStationSelect = makeSelectHandler<OldStationProperties>(
    "old",
    setSelectedStation,
  );

  return (
    <>
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
        />
        <GeoJsonDataSource
          data="/api/data/old_lines.geojson"
          clampToGround
          show={showInactive}
          onLoad={styleGeoJsonLines}
        />
        <RailTracks
          show={showActive}
          dataUrl="/api/data/lines.geojson"
          enable3D={enable3D}
        />
        <RailTracks
          show={showInactive}
          dataUrl="/api/data/old_lines.geojson"
          enable3D={enable3D}
        />
        <StationMarkers
          show={showActive}
          color={STATION_COLOR}
          dataUrl="/api/data/stations.geojson"
          enable3D={enable3D}
          onSelect={handleStationSelect}
        />
        <StationMarkers
          show={showInactive}
          color={INACTIVE_COLOR}
          dataUrl="/api/data/old_stations.geojson"
          enable3D={enable3D}
          onSelect={handleOldStationSelect}
        />
        <StatsTracker
          showActive={showActive}
          showInactive={showInactive}
          onStats={setStats}
        />
      </Viewer>
      <ControlPanel
        showActive={showActive}
        showInactive={showInactive}
        onToggleActive={() => {
          setShowActive((prev) => {
            if (prev) setSelectedStation(null);
            return !prev;
          });
        }}
        onToggleInactive={() => {
          setShowInactive((prev) => {
            if (prev) setSelectedStation(null);
            return !prev;
          });
        }}
        showStats={showStats}
        onToggleStats={() => setShowStats((prev) => !prev)}
        enable3D={enable3D}
        onToggle3D={() => setEnable3D((prev) => !prev)}
      />
      {showStats && (
        <StatsPanel
          stats={stats}
          showActive={showActive}
          showInactive={showInactive}
        />
      )}
      {selectedStation && (
        <StationPopup
          selected={selectedStation}
          onClose={() => setSelectedStation(null)}
        />
      )}
    </>
  );
}
