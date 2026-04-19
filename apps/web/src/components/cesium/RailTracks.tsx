import { useEffect, useRef } from "react";
import { useCesium } from "resium";
import * as Cesium from "cesium";
import type { LineString, FeatureCollection } from "geojson";
import type { FeatureData } from "@/types";
import { bearingDeg, perpOffset, computeBbox, KM_PER_DEG } from "@/utils/geo";
import { clearEntities } from "@/utils/cesium";
import { LINE_COLOR, RAIL_COLOR, TIE_COLOR } from "@/constants";
import { cachedFetch } from "@/utils/fetchCache";

const DETAIL_MAX_ALTITUDE_M = 500;
const RENDER_RADIUS_KM = 0.4;
const RAIL_SUBSEGMENT_KM = 0.005;
const CAMERA_DEBOUNCE_MS = 200; // Debounce before re-rendering
const RAIL_GAUGE_KM = 0.00072; // Distance from track centre to each rail
const BED_HALF_WIDTH_KM = 0.0012; // Ballast bed on each side of centre line
const TIE_HALF_LENGTH_KM = 0.0012; // Size of tie on each side of the centre line (km)
const TIE_SPACING_KM = 0.0006; // Distance between consecutive ties (km)
const BED_HEIGHT_M = 0.15;
const RAIL_HEIGHT_M = 0.25;
const RAIL_WIDTH_M = 0.12;
const TIE_HEIGHT_M = 0.2;
const TIE_WIDTH_M = 0.24;
const JUNCTION_OVERLAP_KM = 0.003;

const COLOR_BED = Cesium.Color.fromCssColorString(LINE_COLOR);
const COLOR_RAIL = Cesium.Color.fromCssColorString(RAIL_COLOR);
const COLOR_TIE = Cesium.Color.fromCssColorString(TIE_COLOR);

// Renders 3D track geometry (ballast bed, steel rails, wooden sleepers)
// Used 3D render and not a glb model because it's not possible to display enough rails
// without fuck up the computer, this approach is way better for performance
// Well, I got the idea but an LLM did the job. I mean... did you see the code? WTF
export const RailTracks = ({
  show,
  dataUrl,
  enable3D,
  onError,
}: {
  show: boolean;
  dataUrl: string;
  enable3D: boolean;
  onError?: () => void;
}) => {
  const { viewer } = useCesium();
  const showRef = useRef(show);
  const enable3DRef = useRef(enable3D);
  const onErrorRef = useRef(onError);
  const updateRef = useRef<() => void>(() => {});

  useEffect(() => {
    showRef.current = show;
    updateRef.current();
  }, [show]);

  useEffect(() => {
    enable3DRef.current = enable3D;
    updateRef.current();
  }, [enable3D]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Do a lot of things and at the end we have rails in 3D
  // No comment below, good luck
  useEffect(() => {
    if (!viewer) return;

    const active: Record<string, Cesium.Entity> = {};

    let features: FeatureData[] = [];
    let ready = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    cachedFetch<FeatureCollection<LineString>>(dataUrl)
      .then((fc) => {
        features = fc.features.map((f) => ({
          coords: f.geometry.coordinates,
          bbox: computeBbox(f.geometry.coordinates),
        }));
        ready = true;
      })
      .catch((err) => {
        console.error(`Failed to load ${dataUrl}`, err);
        onErrorRef.current?.();
      });

    const update = () => {
      if (!ready) return;

      if (!showRef.current || !enable3DRef.current) {
        clearEntities(viewer, active);
        return;
      }

      const cartographic = viewer.camera.positionCartographic;
      const terrainH = viewer.scene.globe.getHeight(cartographic) ?? 0;
      const altitudeM = cartographic.height - terrainH;

      if (altitudeM > DETAIL_MAX_ALTITUDE_M) {
        if (Object.keys(active).length > 0) clearEntities(viewer, active);
        return;
      }

      const cameraLng = Cesium.Math.toDegrees(cartographic.longitude);
      const cameraLat = Cesium.Math.toDegrees(cartographic.latitude);
      const cosLat = Math.cos(cartographic.latitude);
      const bufferDeg = RENDER_RADIUS_KM / KM_PER_DEG;
      const radiusSq = RENDER_RADIUS_KM * RENDER_RADIUS_KM;
      const visibleIds = new Set<string>();

      for (let fi = 0; fi < features.length; fi++) {
        const { coords, bbox } = features[fi]!;

        if (
          cameraLng < bbox[0] - bufferDeg ||
          cameraLng > bbox[2] + bufferDeg ||
          cameraLat < bbox[1] - bufferDeg ||
          cameraLat > bbox[3] + bufferDeg
        )
          continue;

        let minCi = Infinity;
        let maxCi = -Infinity;
        for (let ci = 0; ci < coords.length - 1; ci++) {
          const c0 = coords[ci]!;
          const c1 = coords[ci + 1]!;
          const lng0 = c0[0]!;
          const lat0 = c0[1]!;
          const lng1 = c1[0]!;
          const lat1 = c1[1]!;
          const ax = (lng0 - cameraLng) * cosLat * KM_PER_DEG;
          const ay = (lat0 - cameraLat) * KM_PER_DEG;
          const bx = (lng1 - cameraLng) * cosLat * KM_PER_DEG;
          const by = (lat1 - cameraLat) * KM_PER_DEG;
          if (
            ax * ax + ay * ay > radiusSq * 4 &&
            bx * bx + by * by > radiusSq * 4
          )
            continue;
          if (ci < minCi) minCi = ci;
          if (ci > maxCi) maxCi = ci;
        }
        if (minCi === Infinity) continue;

        for (let ci = minCi; ci <= maxCi; ci++) {
          const rc0 = coords[ci]!;
          const rc1 = coords[ci + 1]!;
          const rawLng0 = rc0[0]!;
          const rawLat0 = rc0[1]!;
          const rawLng1 = rc1[0]!;
          const rawLat1 = rc1[1]!;
          const hdg = bearingDeg(rawLng0, rawLat0, rawLng1, rawLat1);

          const [lng0, lat0] =
            ci === 0
              ? perpOffset(rawLng0, rawLat0, hdg - 90, -JUNCTION_OVERLAP_KM)
              : [rawLng0, rawLat0];
          const [lng1, lat1] =
            ci === coords.length - 2
              ? perpOffset(rawLng1, rawLat1, hdg - 90, JUNCTION_OVERLAP_KM)
              : [rawLng1, rawLat1];

          const segLenKm = Math.sqrt(
            ((lng1 - lng0) * cosLat * KM_PER_DEG) ** 2 +
              ((lat1 - lat0) * KM_PER_DEG) ** 2,
          );
          const railSteps = Math.max(
            1,
            Math.round(segLenKm / RAIL_SUBSEGMENT_KM),
          );
          const tieSteps = Math.max(1, Math.round(segLenKm / TIE_SPACING_KM));

          for (let bi = 0; bi < tieSteps; bi++) {
            const t0 = bi / tieSteps;
            const t1 = (bi + 1) / tieSteps;
            const bLng0 = lng0 + t0 * (lng1 - lng0);
            const bLat0 = lat0 + t0 * (lat1 - lat0);
            const bLng1 = lng0 + t1 * (lng1 - lng0);
            const bLat1 = lat0 + t1 * (lat1 - lat0);

            const [llng0, llat0] = perpOffset(
              bLng0,
              bLat0,
              hdg,
              -BED_HALF_WIDTH_KM,
            );

            const [rlng0, rlat0] = perpOffset(
              bLng0,
              bLat0,
              hdg,
              BED_HALF_WIDTH_KM,
            );

            const [rlng1, rlat1] = perpOffset(
              bLng1,
              bLat1,
              hdg,
              BED_HALF_WIDTH_KM,
            );

            const [llng1, llat1] = perpOffset(
              bLng1,
              bLat1,
              hdg,
              -BED_HALF_WIDTH_KM,
            );

            const bedId = `bed-${fi}-${ci}-${bi}`;

            visibleIds.add(bedId);

            if (!(bedId in active)) {
              active[bedId] = viewer.entities.add({
                polygon: {
                  hierarchy: new Cesium.PolygonHierarchy([
                    Cesium.Cartesian3.fromDegrees(llng0, llat0),
                    Cesium.Cartesian3.fromDegrees(rlng0, rlat0),
                    Cesium.Cartesian3.fromDegrees(rlng1, rlat1),
                    Cesium.Cartesian3.fromDegrees(llng1, llat1),
                  ]),
                  height: 0,
                  extrudedHeight: BED_HEIGHT_M,
                  heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
                  extrudedHeightReference:
                    Cesium.HeightReference.RELATIVE_TO_GROUND,
                  material: COLOR_BED,
                },
              });
            }
          }

          for (const side of [-1, 1] as const) {
            for (let ri = 0; ri < railSteps; ri++) {
              const t0 = ri / railSteps;
              const t1 = (ri + 1) / railSteps;
              const rLng0 = lng0 + t0 * (lng1 - lng0);
              const rLat0 = lat0 + t0 * (lat1 - lat0);
              const rLng1 = lng0 + t1 * (lng1 - lng0);
              const rLat1 = lat0 + t1 * (lat1 - lat0);
              const [oLng0, oLat0] = perpOffset(
                rLng0,
                rLat0,
                hdg,
                RAIL_GAUGE_KM * side,
              );
              const [oLng1, oLat1] = perpOffset(
                rLng1,
                rLat1,
                hdg,
                RAIL_GAUGE_KM * side,
              );
              const railId = `rail-${fi}-${ci}-${ri}-${side}`;
              visibleIds.add(railId);
              if (!(railId in active)) {
                active[railId] = viewer.entities.add({
                  corridor: {
                    positions: [
                      Cesium.Cartesian3.fromDegrees(oLng0, oLat0),
                      Cesium.Cartesian3.fromDegrees(oLng1, oLat1),
                    ],
                    width: RAIL_WIDTH_M,
                    height: 0,
                    extrudedHeight: RAIL_HEIGHT_M,
                    heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
                    extrudedHeightReference:
                      Cesium.HeightReference.RELATIVE_TO_GROUND,
                    material: COLOR_RAIL,
                  },
                });
              }
            }
          }

          for (let si = 0; si < tieSteps; si++) {
            const t = si / tieSteps;
            const lng = lng0 + t * (lng1 - lng0);
            const lat = lat0 + t * (lat1 - lat0);
            const [leftLng, leftLat] = perpOffset(
              lng,
              lat,
              hdg,
              -TIE_HALF_LENGTH_KM,
            );
            const [rightLng, rightLat] = perpOffset(
              lng,
              lat,
              hdg,
              TIE_HALF_LENGTH_KM,
            );
            const tieId = `tie-${fi}-${ci}-${si}`;
            visibleIds.add(tieId);
            if (!(tieId in active)) {
              active[tieId] = viewer.entities.add({
                corridor: {
                  positions: [
                    Cesium.Cartesian3.fromDegrees(leftLng, leftLat),
                    Cesium.Cartesian3.fromDegrees(rightLng, rightLat),
                  ],
                  width: TIE_WIDTH_M,
                  height: 0,
                  extrudedHeight: TIE_HEIGHT_M,
                  heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
                  extrudedHeightReference:
                    Cesium.HeightReference.RELATIVE_TO_GROUND,
                  material: COLOR_TIE,
                },
              });
            }
          }
        }
      }

      for (const id in active) {
        if (!visibleIds.has(id)) {
          viewer.entities.remove(active[id]!);
          delete active[id];
        }
      }
    };

    updateRef.current = update;

    const onCameraChanged = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(update, CAMERA_DEBOUNCE_MS);
    };

    viewer.camera.changed.addEventListener(onCameraChanged);

    return () => {
      updateRef.current = () => {};
      if (timeout) clearTimeout(timeout);
      viewer.camera.changed.removeEventListener(onCameraChanged);
      clearEntities(viewer, active);
    };
  }, [viewer, dataUrl]);

  return null;
};
