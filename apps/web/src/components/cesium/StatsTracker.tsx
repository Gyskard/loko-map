import { useEffect, useRef } from "react";
import { useCesium } from "resium";
import * as Cesium from "cesium";
import { sumVisibleKm, totalKm } from "@/utils/stats";
import type { LineFeature } from "@/utils/stats";
import type { StatsData } from "@/types";
import type { GeoStatsData } from "@loko-map/shared";
import { DATA_URLS } from "@/api";
import { cachedFetch } from "@/utils/fetchCache";

const CAMERA_DEBOUNCE_MS = 150;

type PointCoord = { lng: number; lat: number };

// Display statistics depending of the data and of what's user is seeing
export const StatsTracker = ({
  showActive,
  showInactive,
  onStats,
  onError,
}: {
  showActive: boolean;
  showInactive: boolean;
  onStats: (stats: StatsData) => void;
  onError?: () => void;
}) => {
  const { viewer } = useCesium();

  const showActiveRef = useRef(showActive);
  const showInactiveRef = useRef(showInactive);
  const onStatsRef = useRef(onStats);
  const onErrorRef = useRef(onError);
  const computeRef = useRef<() => void>(() => {});

  useEffect(() => {
    onStatsRef.current = onStats;
  }, [onStats]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    showActiveRef.current = showActive;
    computeRef.current();
  }, [showActive]);

  useEffect(() => {
    showInactiveRef.current = showInactive;
    computeRef.current();
  }, [showInactive]);

  useEffect(() => {
    if (!viewer) return;

    const activeLines: LineFeature[] = [];
    const abandonedLines: LineFeature[] = [];
    const activeStations: PointCoord[] = [];
    const oldStations: PointCoord[] = [];

    let loaded = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    // Load data
    cachedFetch<GeoStatsData>(DATA_URLS.stats)
      .then((data) => {
        activeLines.push(...data.lines);
        abandonedLines.push(...data.oldLines);
        activeStations.push(
          ...data.stations.map(([lng, lat]: [number, number]) => ({
            lng,
            lat,
          })),
        );
        oldStations.push(
          ...data.oldStations.map(([lng, lat]: [number, number]) => ({
            lng,
            lat,
          })),
        );

        loaded = true;

        computeRef.current();
      })
      .catch((err) => {
        console.error("StatsTracker: failed to load stats", err);
        onErrorRef.current?.();
      });

    // Do the computation on data to get stats
    const compute = () => {
      if (!loaded) return;

      // User view
      const rect = viewer.camera.computeViewRectangle();

      const [west, south, east, north] = (() => {
        if (!rect) return [-180, -90, 180, 90];

        // Convert radians bounding of user view to degrees
        const w = Cesium.Math.toDegrees(rect.west);
        const s = Cesium.Math.toDegrees(rect.south);
        const e = Cesium.Math.toDegrees(rect.east);
        const n = Cesium.Math.toDegrees(rect.north);

        // Add a few degrees to compensate for computeViewRectangle()
        // being approximate in 3D globe mode
        const bufLng = (e - w) * 0.02;
        const bufLat = (n - s) * 0.02;

        return [w - bufLng, s - bufLat, e + bufLng, n + bufLat];
      })();

      const countVisiblePoints = (points: PointCoord[]) =>
        points.filter(
          ({ lng, lat }) =>
            lng >= west && lng <= east && lat >= south && lat <= north,
        ).length;

      const active = showActiveRef.current;
      const inactive = showInactiveRef.current;

      onStatsRef.current({
        activeLines: {
          totalKm: totalKm(activeLines),
          visibleKm: active
            ? sumVisibleKm(activeLines, west, south, east, north)
            : 0,
        },
        activeStations: {
          total: activeStations.length,
          visible: active ? countVisiblePoints(activeStations) : 0,
        },
        abandonedLines: {
          totalKm: totalKm(abandonedLines),
          visibleKm: inactive
            ? sumVisibleKm(abandonedLines, west, south, east, north)
            : 0,
        },
        oldStations: {
          total: oldStations.length,
          visible: inactive ? countVisiblePoints(oldStations) : 0,
        },
      });
    };

    computeRef.current = compute;

    // debounce for camera movement
    const onCameraChanged = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(compute, CAMERA_DEBOUNCE_MS);
    };

    viewer.camera.changed.addEventListener(onCameraChanged);
    viewer.camera.moveEnd.addEventListener(compute); // compute new stats when moving stopped

    return () => {
      computeRef.current = () => {};

      if (timeout) clearTimeout(timeout);

      viewer.camera.changed.removeEventListener(onCameraChanged);
      viewer.camera.moveEnd.removeEventListener(compute);
    };
  }, [viewer]);

  return null;
};
