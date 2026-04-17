import { useState } from "react";
import { CesiumScene } from "./cesium/CesiumScene";
import { ControlPanel } from "./ui/ControlPanel";
import { StatsPanel } from "./ui/StatsPanel";
import { StationPopup } from "./ui/StationPopup";
import { ErrorBanner } from "./ui/ErrorBanner";
import type {
  SelectedStation,
  StatsData,
  StationProperties,
  OldStationProperties,
} from "@/types";

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

export function MapViewer() {
  const [showActive, setShowActive] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedStation, setSelectedStation] =
    useState<SelectedStation | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [showStats, setShowStats] = useState(true);
  const [enable3D, setEnable3D] = useState(true);
  const [dataError, setDataError] = useState(false);

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
      <CesiumScene
        showActive={showActive}
        showInactive={showInactive}
        enable3D={enable3D}
        onStats={setStats}
        onError={() => setDataError(true)}
        onStationSelect={handleStationSelect}
        onOldStationSelect={handleOldStationSelect}
      />
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
      {dataError && <ErrorBanner onClose={() => setDataError(false)} />}
    </>
  );
}
