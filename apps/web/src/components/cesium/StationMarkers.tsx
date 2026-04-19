import { useEffect, useMemo, useRef } from "react";
import { useCesium } from "resium";
import * as Cesium from "cesium";
import type { Point, FeatureCollection } from "geojson";
import { KM_PER_DEG } from "@/utils/geo";
import { clearEntities } from "@/utils/cesium";
import { cachedFetch } from "@/utils/fetchCache";
import { pinIcon } from "@/utils/pinIcon";

// Tracks which StationMarkers instances currently want a "pointer" cursor.
// Using a WeakMap keyed on the canvas means it's automatically cleaned up
// and shared across all marker instances for the same viewer.
const cursorWanted = new WeakMap<HTMLCanvasElement, Set<symbol>>();

const STATION_3D_MAX_ALTITUDE_M = 50_000;
const RENDER_RADIUS_KM = 100;
const CAMERA_DEBOUNCE_MS = 200;

type Station<T> = {
  coord: [number, number];
  props: T;
};

type Props<T extends { id: string }> = {
  show: boolean;
  color: string;
  dataUrl: string;
  enable3D: boolean;
  onSelect: (props: T | null) => void;
  onError?: () => void;
};

export const StationMarkers = <T extends { id: string }>({
  show,
  color,
  dataUrl,
  enable3D,
  onSelect,
  onError,
}: Props<T>) => {
  const { viewer } = useCesium();
  const onSelectRef = useRef(onSelect);
  const onErrorRef = useRef(onError);
  const showRef = useRef(show);
  const enable3DRef = useRef(enable3D);
  const updateRef = useRef<() => void>(() => {});

  const icon = useMemo(() => pinIcon(color), [color]);
  const cesiumColor = useMemo(
    () => Cesium.Color.fromCssColorString(color),
    [color],
  );

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    showRef.current = show;
    updateRef.current();
  }, [show]);

  useEffect(() => {
    enable3DRef.current = enable3D;
    updateRef.current();
  }, [enable3D]);

  useEffect(() => {
    if (!viewer) return;

    let stations: Station<T>[] = [];
    let ready = false;
    let cancelled = false;
    const active: Record<string, Cesium.Entity> = {};
    const propsByStationId: Record<string, T> = {};
    let timeout: ReturnType<typeof setTimeout> | null = null;

    // GPU-accelerated point collection for the overview (above threshold)
    const pointCollection = viewer.scene.primitives.add(
      new Cesium.PointPrimitiveCollection(),
    );

    const update = () => {
      if (!ready) return;

      if (!showRef.current) {
        pointCollection.show = false;
        clearEntities(viewer, active);
        return;
      }

      const cartographic = viewer.camera.positionCartographic;
      const terrainH = viewer.scene.globe.getHeight(cartographic) ?? 0;
      const altitudeM = cartographic.height - terrainH;

      if (altitudeM > STATION_3D_MAX_ALTITUDE_M || !enable3DRef.current) {
        // Overview mode: flat dots, no billboard entities
        pointCollection.show = true;
        if (Object.keys(active).length > 0) clearEntities(viewer, active);
        return;
      }

      // Detail mode: hide flat dots, show billboard entities near camera
      pointCollection.show = false;

      const cameraLng = Cesium.Math.toDegrees(cartographic.longitude);
      const cameraLat = Cesium.Math.toDegrees(cartographic.latitude);
      const cosLat = Math.cos(cartographic.latitude);

      for (const station of stations) {
        const [lng, lat] = station.coord;
        const dx = (lng - cameraLng) * cosLat * KM_PER_DEG;
        const dy = (lat - cameraLat) * KM_PER_DEG;
        const distKm = Math.sqrt(dx * dx + dy * dy);
        const entityId = station.props.id;
        const visible = distKm < RENDER_RADIUS_KM;

        if (visible && !(entityId in active)) {
          active[entityId] = viewer.entities.add({
            id: entityId,
            position: Cesium.Cartesian3.fromDegrees(lng, lat, 20),
            billboard: {
              image: icon,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
              scale: 0.8,
            },
          });
        } else if (!visible && entityId in active) {
          viewer.entities.remove(active[entityId]!);
          delete active[entityId];
        }
      }
    };

    cachedFetch<FeatureCollection<Point>>(dataUrl)
      .then((fc) => {
        if (cancelled) return;

        stations = fc.features.map((f) => ({
          coord: f.geometry.coordinates as [number, number],
          props: f.properties as T,
        }));

        for (const station of stations) {
          const [lng, lat] = station.coord;
          pointCollection.add({
            id: station.props.id,
            position: Cesium.Cartesian3.fromDegrees(lng, lat),
            color: cesiumColor,
            pixelSize: 6,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 1,
          });
          propsByStationId[station.props.id] = station.props;
        }

        ready = true;
        update();
      })
      .catch((err) => {
        console.error(`Failed to load ${dataUrl}`, err);
        onErrorRef.current?.();
      });

    updateRef.current = update;

    // Resolves a station id from a scene.pick() result regardless of whether
    // it came from a billboard Entity or a PointPrimitive.
    const pickStationId = (picked: unknown): string | null => {
      if (!picked || typeof picked !== "object" || !("id" in picked)) {
        return null;
      }
      const { id } = picked as { id: unknown };
      if (id instanceof Cesium.Entity) {
        return typeof id.id === "string" && id.id in propsByStationId
          ? id.id
          : null;
      }
      if (typeof id === "string" && id in propsByStationId) return id;
      return null;
    };

    const canvas = viewer.scene.canvas;
    const handler = new Cesium.ScreenSpaceEventHandler(canvas);
    const markerId = Symbol();
    if (!cursorWanted.has(canvas)) cursorWanted.set(canvas, new Set());
    const wantedSet = cursorWanted.get(canvas)!;

    handler.setInputAction(
      (event: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        if (!showRef.current) {
          wantedSet.delete(markerId);
          canvas.style.cursor = wantedSet.size > 0 ? "pointer" : "";
          return;
        }
        const picked = viewer.scene.pick(event.endPosition);
        if (pickStationId(picked)) {
          wantedSet.add(markerId);
        } else {
          wantedSet.delete(markerId);
        }
        canvas.style.cursor = wantedSet.size > 0 ? "pointer" : "";
      },
      Cesium.ScreenSpaceEventType.MOUSE_MOVE,
    );

    handler.setInputAction(
      (event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        if (!showRef.current) return;
        const stationId = pickStationId(viewer.scene.pick(event.position));
        if (stationId) {
          onSelectRef.current(propsByStationId[stationId] ?? null);
        } else {
          onSelectRef.current(null);
        }
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK,
    );

    const onCameraChanged = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(update, CAMERA_DEBOUNCE_MS);
    };

    viewer.camera.changed.addEventListener(onCameraChanged);

    return () => {
      cancelled = true;
      updateRef.current = () => {};
      if (timeout) clearTimeout(timeout);
      handler.destroy();
      wantedSet.delete(markerId);
      canvas.style.cursor = wantedSet.size > 0 ? "pointer" : "";
      viewer.camera.changed.removeEventListener(onCameraChanged);
      viewer.scene.primitives.remove(pointCollection);
      clearEntities(viewer, active);
    };
  }, [viewer, icon, cesiumColor, dataUrl]);

  return null;
};
