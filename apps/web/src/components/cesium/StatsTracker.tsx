import { useEffect, useRef } from "react";
import { useCesium } from "resium";
import * as Cesium from "cesium";
import type { LineString, Point, FeatureCollection } from "geojson";
import { computeLineFeature, sumVisibleKm, totalKm } from "@/utils/stats";
import type { LineFeature } from "@/utils/stats";
import type { StatsData } from "@/types";

const CAMERA_DEBOUNCE_MS = 150;

type Props = {
  showActive: boolean;
  showInactive: boolean;
  onStats: (stats: StatsData) => void;
  onError?: () => void;
};

type PointCoord = { lng: number; lat: number };

export function StatsTracker({
  showActive,
  showInactive,
  onStats,
  onError,
}: Props) {
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

    let loadedCount = 0;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const tryCompute = () => {
      if (loadedCount < 4) return;
      computeRef.current();
    };

    const loadLines = (url: string, target: LineFeature[]) => {
      fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((fc: FeatureCollection<LineString>) => {
          for (const f of fc.features) {
            target.push(
              computeLineFeature(f.geometry.coordinates as number[][]),
            );
          }
          loadedCount++;
          tryCompute();
        })
        .catch((err) => {
          console.error(`StatsTracker: failed to load ${url}`, err);
          onErrorRef.current?.();
        });
    };

    const loadPoints = (url: string, target: PointCoord[]) => {
      fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((fc: FeatureCollection<Point>) => {
          for (const f of fc.features) {
            const [lng, lat] = f.geometry.coordinates;
            target.push({ lng, lat });
          }
          loadedCount++;
          tryCompute();
        })
        .catch((err) => {
          console.error(`StatsTracker: failed to load ${url}`, err);
          onErrorRef.current?.();
        });
    };

    loadLines("/api/data/lines.geojson", activeLines);
    loadLines("/api/data/old_lines.geojson", abandonedLines);
    loadPoints("/api/data/stations.geojson", activeStations);
    loadPoints("/api/data/old_stations.geojson", oldStations);

    const compute = () => {
      if (loadedCount < 4) return;

      const rect = viewer.camera.computeViewRectangle();
      const [west, south, east, north] = (() => {
        if (!rect) return [-180, -90, 180, 90];
        const w = Cesium.Math.toDegrees(rect.west);
        const s = Cesium.Math.toDegrees(rect.south);
        const e = Cesium.Math.toDegrees(rect.east);
        const n = Cesium.Math.toDegrees(rect.north);
        // Small proportional buffer to compensate for computeViewRectangle()
        // being approximate in 3D globe mode. No fixed minimum — at city zoom
        // a large fixed buffer would pull in stations far off screen.
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

    const onCameraChanged = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(compute, CAMERA_DEBOUNCE_MS);
    };

    viewer.camera.changed.addEventListener(onCameraChanged);
    // moveEnd fires once the camera fully stops (including end of fly animations)
    // — triggers an immediate recompute without waiting for the debounce.
    viewer.camera.moveEnd.addEventListener(compute);

    return () => {
      computeRef.current = () => {};
      if (timeout) clearTimeout(timeout);
      viewer.camera.changed.removeEventListener(onCameraChanged);
      viewer.camera.moveEnd.removeEventListener(compute);
    };
  }, [viewer]);

  return null;
}
