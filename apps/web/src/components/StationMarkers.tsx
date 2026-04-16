import { useEffect, useMemo, useRef } from "react";
import { useCesium } from "resium";
import * as Cesium from "cesium";
import type { Point, FeatureCollection } from "geojson";
import { KM_PER_DEG } from "@/utils/geo";
import { clearEntities } from "@/utils/cesium";

// Altitude below which 3D billboard markers replace the flat overview dots
const STATION_3D_MAX_ALTITUDE_M = 50_000;

// Radius around the camera within which billboard entities are created (km)
const RENDER_RADIUS_KM = 100;

const CAMERA_DEBOUNCE_MS = 200;

// Returns a data-URI for a pin-shaped SVG marker with a small train-car icon
// centred inside the circle. The pin tip sits at the bottom of the 40×52 viewport
// so Cesium's BOTTOM vertical-origin aligns the tip with the station coordinate.
const makeIcon = (color: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" width="40" height="52">` +
      `<path d="M20 1C9.5 1 1 9.5 1 20C1 33 20 51 20 51C20 51 39 33 39 20C39 9.5 30.5 1 20 1Z" fill="${color}"/>` +
      `<circle cx="20" cy="20" r="13" fill="white"/>` +
      `<rect x="12" y="14" width="16" height="10" rx="2" fill="${color}"/>` +
      `<rect x="14" y="16" width="4" height="3" rx="1" fill="white"/>` +
      `<rect x="22" y="16" width="4" height="3" rx="1" fill="white"/>` +
      `<rect x="11" y="25" width="18" height="2" rx="1" fill="${color}"/>` +
      `</svg>`,
  )}`;

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
};

export function StationMarkers<T extends { id: string }>({
  show,
  color,
  dataUrl,
  enable3D,
  onSelect,
}: Props<T>) {
  const { viewer } = useCesium();
  const onSelectRef = useRef(onSelect);
  const showRef = useRef(show);
  const enable3DRef = useRef(enable3D);
  const updateRef = useRef<() => void>(() => {});

  const icon = useMemo(() => makeIcon(color), [color]);
  const cesiumColor = useMemo(
    () => Cesium.Color.fromCssColorString(color),
    [color],
  );

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

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
          viewer.entities.remove(active[entityId]);
          delete active[entityId];
        }
      }
    };

    fetch(dataUrl)
      .then((r) => r.json())
      .then((fc: FeatureCollection<Point>) => {
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
      .catch((err) => console.error(`Failed to load ${dataUrl}`, err));

    updateRef.current = update;

    // Resolves a station id from a scene.pick() result regardless of whether
    // it came from a billboard Entity or a PointPrimitive.
    const pickStationId = (picked: unknown): string | null => {
      if (!Cesium.defined(picked)) return null;
      const p = picked as { id?: unknown };
      if (p.id instanceof Cesium.Entity) {
        const id = p.id.id as string;
        return id in propsByStationId ? id : null;
      }
      if (typeof p.id === "string" && p.id in propsByStationId) {
        return p.id;
      }
      return null;
    };

    const canvas = viewer.scene.canvas;
    const handler = new Cesium.ScreenSpaceEventHandler(canvas);

    handler.setInputAction(
      (event: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        if (!showRef.current) return;
        const picked = viewer.scene.pick(event.endPosition);
        canvas.style.cursor = pickStationId(picked) ? "pointer" : "";
      },
      Cesium.ScreenSpaceEventType.MOUSE_MOVE,
    );

    handler.setInputAction(
      (event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        if (!showRef.current) return;
        const stationId = pickStationId(viewer.scene.pick(event.position));
        if (stationId) {
          onSelectRef.current(propsByStationId[stationId]);
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
      canvas.style.cursor = "";
      viewer.camera.changed.removeEventListener(onCameraChanged);
      viewer.scene.primitives.remove(pointCollection);
      clearEntities(viewer, active);
    };
  }, [viewer, icon, cesiumColor, dataUrl]);

  return null;
}
