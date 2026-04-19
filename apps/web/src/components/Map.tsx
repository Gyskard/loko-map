import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CesiumScene } from "./cesium/CesiumScene";
import { ControlPanel } from "./ui/ControlPanel";
import { StatsPanel } from "./ui/StatsPanel";
import { StationPopup } from "./ui/StationPopup";
import { ErrorBanner } from "./ui/ErrorBanner";
import type {
  SelectedStation,
  StationProperties,
  OldStationProperties,
  StatsData,
  TrainInfo,
} from "@/types";

const LOADING_TIMEOUT_MS = 10_000;

export const MapViewer = () => {
  const { t } = useTranslation();
  const [showActive, setShowActive] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedStation, setSelectedStation] =
    useState<SelectedStation | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [showStats, setShowStats] = useState(true);
  const [enable3D, setEnable3D] = useState(true);
  const [dataError, setDataError] = useState(false);
  const [trains, setTrains] = useState<TrainInfo[]>([]);
  const [showTrains, setShowTrains] = useState(true);
  const [loadTimedOut, setLoadTimedOut] = useState(false);

  useEffect(() => {
    if (stats) return;
    const id = setTimeout(() => setLoadTimedOut(true), LOADING_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [stats]);

  const handleStationSelect = (props: StationProperties | null) => {
    if (props) {
      setSelectedStation({ kind: "active", props });
    } else {
      setSelectedStation((prev) => (prev?.kind === "active" ? null : prev));
    }
  };

  const handleOldStationSelect = (props: OldStationProperties | null) => {
    if (props) {
      setSelectedStation({ kind: "old", props });
    } else {
      setSelectedStation((prev) => (prev?.kind === "old" ? null : prev));
    }
  };

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
        onTrainsReady={setTrains}
        showTrains={showTrains}
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
        trains={trains}
        showTrains={showTrains}
        onToggleTrains={() => setShowTrains((prev) => !prev)}
      />
      {showStats && (
        <StatsPanel
          stats={stats}
          showActive={showActive}
          showInactive={showInactive}
          trainsCount={showTrains && showInactive ? trains.length : 0}
        />
      )}
      {selectedStation && (
        <StationPopup
          selected={selectedStation}
          onClose={() => setSelectedStation(null)}
        />
      )}
      {dataError && <ErrorBanner onClose={() => setDataError(false)} />}
      {!stats && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50"
          role="status"
          aria-live="polite"
        >
          <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center text-gray-500">
            {loadTimedOut ? (
              <>
                <span className="text-sm">{t("app.loadTimeout")}</span>
                <button
                  onClick={() => window.location.reload()}
                  className="rounded bg-gray-800 px-3 py-1 text-xs font-medium text-white hover:bg-gray-700"
                >
                  {t("errors.reload")}
                </button>
              </>
            ) : (
              <>
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                <span className="text-sm">{t("app.loading")}</span>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
