import { useEffect, useRef } from "react";
import { useCesium } from "resium";
import * as Cesium from "cesium";
import type { FeatureCollection, LineString, Point } from "geojson";
import type { TrainInfo } from "@/types";
import { DATA_URLS } from "@/api";
import { haversineKm } from "@/utils/stats";
import { buildPositionProperty, CLOCK_LOOP_S } from "@/utils/trains";
import { cachedFetch } from "@/utils/fetchCache";

const NUM_TRAINS = 4;
const MODEL_MAX_DISTANCE_M = 250; // switch from billboard to 3D model below this distance
const MIN_TRACK_LENGTH_KM = 0.5; // ignore tracks shorter than this (too short to animate)
const FLY_DURATION_S = 1.5;
const FLY_CAM_OFFSET_M = 20; // radial offset used as initial flyTo destination
const FOLLOW_CAM_DISTANCE_M = 50; // distance from train after snap
const FOLLOW_CAM_PITCH_DEG = -30;
const FOLLOW_DEVIATION_THRESHOLD_M = 2.0; // camera drift above this means user is navigating
const SMOKE_HEIGHT_OFFSET_M = 5; // smoke emitter height above train position
const TRAIN_ICON = "/locomotive.png";

type Station = { coord: [number, number]; name: string };
type TrackingRef = { current: (() => void) | undefined };

const makeSmokeTexture = (): string => {
  const canvas = document.createElement("canvas");

  canvas.width = 64;
  canvas.height = 64;

  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);

  g.addColorStop(0, "rgba(200, 200, 200, 0.9)");
  g.addColorStop(1, "rgba(200, 200, 200, 0)");

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);

  return canvas.toDataURL();
};

const nearestStation = (
  trackCoords: number[][],
  stations: Station[],
): string | undefined => {
  let minDist = Infinity;
  let name: string | undefined;

  for (const s of stations) {
    for (const c of trackCoords) {
      const d = haversineKm(c[0]!, c[1]!, s.coord[0], s.coord[1]);

      if (d < minDist) {
        minDist = d;
        name = s.name;
      }
    }
  }
  return name;
};

const makeFlyTo =
  (entity: Cesium.Entity, viewer: Cesium.Viewer, trackingRef: TrackingRef) =>
  () => {
    trackingRef.current?.();

    const currentPos = (
      entity.position as Cesium.SampledPositionProperty
    ).getValue(viewer.clock.currentTime);
    if (!currentPos) return;

    const up = Cesium.Cartesian3.normalize(currentPos, new Cesium.Cartesian3());
    const camPos = Cesium.Cartesian3.add(
      currentPos,
      Cesium.Cartesian3.multiplyByScalar(
        up,
        FLY_CAM_OFFSET_M,
        new Cesium.Cartesian3(),
      ),
      new Cesium.Cartesian3(),
    );

    viewer.camera.flyTo({
      destination: camPos,
      orientation: {
        heading: viewer.camera.heading,
        pitch: Cesium.Math.toRadians(FOLLOW_CAM_PITCH_DEG),
        roll: 0,
      },
      duration: FLY_DURATION_S,
      complete: () => {
        let active = true;

        const trainPosNow = (
          entity.position as Cesium.SampledPositionProperty
        ).getValue(viewer.clock.currentTime);

        if (trainPosNow) {
          viewer.camera.lookAt(
            trainPosNow,
            new Cesium.HeadingPitchRange(
              viewer.camera.heading,
              Cesium.Math.toRadians(FOLLOW_CAM_PITCH_DEG),
              FOLLOW_CAM_DISTANCE_M,
            ),
          );
          viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        }

        let prevTrainPos: Cesium.Cartesian3 | undefined =
          trainPosNow ?? undefined;
        let prevCamPos: Cesium.Cartesian3 = viewer.camera.positionWC.clone();

        const onTick = (clock: Cesium.Clock) => {
          if (!active) return;

          const trainPos = (
            entity.position as Cesium.SampledPositionProperty
          ).getValue(clock.currentTime);

          if (!trainPos) return;

          if (prevTrainPos) {
            const trainDelta = Cesium.Cartesian3.subtract(
              trainPos,
              prevTrainPos,
              new Cesium.Cartesian3(),
            );

            const expectedCamPos = Cesium.Cartesian3.add(
              prevCamPos,
              trainDelta,
              new Cesium.Cartesian3(),
            );

            // User is navigating so stop tracking
            if (
              Cesium.Cartesian3.distance(
                viewer.camera.positionWC,
                expectedCamPos,
              ) > FOLLOW_DEVIATION_THRESHOLD_M
            ) {
              active = false;
              viewer.clock.onTick.removeEventListener(onTick);
              return;
            }

            viewer.camera.setView({
              destination: expectedCamPos,
              orientation: {
                direction: viewer.camera.directionWC,
                up: viewer.camera.upWC,
              },
            });
          }

          prevTrainPos = Cesium.Cartesian3.clone(trainPos);
          prevCamPos = viewer.camera.positionWC.clone();
        };

        viewer.clock.onTick.addEventListener(onTick);

        trackingRef.current = () => {
          active = false;
          viewer.clock.onTick.removeEventListener(onTick);
        };
      },
    });
  };

const makePostUpdateHandler =
  (
    entities: Cesium.Entity[],
    particles: Cesium.ParticleSystem[],
    enable3DRef: React.RefObject<boolean>,
    camera: Cesium.Camera,
  ) =>
  (_scene: Cesium.Scene, time: Cesium.JulianDate) => {
    const cameraPos = camera.position;

    entities.forEach((entity, idx) => {
      const particle = particles[idx];
      if (!particle) return;

      const pos = (entity.position as Cesium.SampledPositionProperty).getValue(
        time,
      );
      if (!pos) return;

      const distanceM = Cesium.Cartesian3.distance(pos, cameraPos);
      const smokeVisible =
        entity.show && enable3DRef.current && distanceM <= MODEL_MAX_DISTANCE_M;

      particle.show = smokeVisible;
      if (!smokeVisible) return;

      const up = Cesium.Cartesian3.normalize(pos, new Cesium.Cartesian3());
      const smokePos = Cesium.Cartesian3.add(
        pos,
        Cesium.Cartesian3.multiplyByScalar(
          up,
          SMOKE_HEIGHT_OFFSET_M,
          new Cesium.Cartesian3(),
        ),
        new Cesium.Cartesian3(),
      );

      particle.modelMatrix =
        Cesium.Transforms.eastNorthUpToFixedFrame(smokePos);
    });
  };

export const SteamTrains = ({
  show,
  enable3D,
  onTrainsReady,
  onError,
}: {
  show: boolean;
  enable3D: boolean;
  onTrainsReady: (trains: TrainInfo[]) => void;
  onError?: () => void;
}) => {
  const { viewer } = useCesium();
  const showRef = useRef(show);
  const enable3DRef = useRef(enable3D);
  const entitiesRef = useRef<Cesium.Entity[]>([]);
  const particlesRef = useRef<Cesium.ParticleSystem[]>([]);
  const smokeTextureRef = useRef<string | null>(null);
  const onTrainsReadyRef = useRef(onTrainsReady);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTrainsReadyRef.current = onTrainsReady;
  }, [onTrainsReady]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    showRef.current = show;
    enable3DRef.current = enable3D;

    for (const e of entitiesRef.current) {
      e.show = show;

      if (e.model) e.model.show = new Cesium.ConstantProperty(enable3D);

      // to remember : a billboard is a 2D icon in Cesium
      if (e.billboard)
        e.billboard.distanceDisplayCondition = new Cesium.ConstantProperty(
          enable3D
            ? new Cesium.DistanceDisplayCondition(
                MODEL_MAX_DISTANCE_M,
                Number.MAX_VALUE,
              )
            : new Cesium.DistanceDisplayCondition(0, Number.MAX_VALUE),
        );
    }
    // smoke visibility is managed per-frame in onPostUpdate
    for (const p of particlesRef.current) if (!show) p.show = false;
  }, [show, enable3D]);

  // Loads old track data, picks up to NUM_TRAINS random lines, then spawns one
  // train entity + smoke particle system per line. A postUpdate listener keeps
  // the smoke positioned above each train every frame.
  useEffect(() => {
    if (!viewer) return;

    smokeTextureRef.current ??= makeSmokeTexture();

    let cleanupFn: (() => void) | undefined;

    const run = async () => {
      let fc: FeatureCollection<LineString>;
      let stationsFc: FeatureCollection<Point>;

      // Trains run on old (abandoned) lines, stations are used to label the nearest stop
      try {
        [fc, stationsFc] = await Promise.all([
          cachedFetch<FeatureCollection<LineString>>(DATA_URLS.oldLines),
          cachedFetch<FeatureCollection<Point>>(DATA_URLS.oldStations),
        ]);
      } catch (err) {
        console.error("Failed to load old lines for trains", err);
        onErrorRef.current?.();
        return;
      }

      // Process stations
      const stations = stationsFc.features
        .map((f) => ({
          coord: f.geometry.coordinates as [number, number],
          name: (f.properties?.nom ?? f.properties?.id) as string | undefined,
        }))
        .filter((s): s is Station => s.name !== undefined);

      // Check if tracks are long enough to have animating train on it
      const eligible = fc.features.filter((f) => {
        const c = f.geometry.coordinates;
        let len = 0;

        for (let i = 1; i < c.length; i++)
          len += haversineKm(
            c[i - 1]![0]!,
            c[i - 1]![1]!,
            c[i]![0]!,
            c[i]![1]!,
          );

        return len > MIN_TRACK_LENGTH_KM;
      });

      if (eligible.length === 0) return;

      // Selected random tracks
      const selected = [...eligible]
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(NUM_TRAINS, eligible.length));

      const startTime = Cesium.JulianDate.now();

      // Set the scene clock to a 1-hour loop starting now, at real-time speed
      viewer.clock.startTime = startTime;
      viewer.clock.stopTime = Cesium.JulianDate.addSeconds(
        startTime,
        CLOCK_LOOP_S,
        new Cesium.JulianDate(),
      );
      viewer.clock.currentTime = startTime.clone();
      viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
      viewer.clock.multiplier = 1;
      viewer.clock.shouldAnimate = true;

      const entities: Cesium.Entity[] = [];
      const particles: Cesium.ParticleSystem[] = [];
      const trainInfos: TrainInfo[] = [];
      const trackingRef: TrackingRef = { current: undefined };

      for (const [idx, feature] of selected.entries()) {
        const coords = feature.geometry.coordinates;

        // Get the full position timeline for this train
        const position = buildPositionProperty(
          coords,
          startTime,
          idx / selected.length,
        );
        const velocityOrientation = new Cesium.VelocityOrientationProperty(
          position,
        );

        // The GLB model faces along its Y axis; rotate 90° so it faces the direction of travel
        const leftOffset = Cesium.Quaternion.fromAxisAngle(
          Cesium.Cartesian3.UNIT_Z,
          Cesium.Math.toRadians(90),
          new Cesium.Quaternion(),
        );

        const entity = viewer.entities.add({
          show: showRef.current,
          position,
          orientation: new Cesium.CallbackProperty((time) => {
            const q = velocityOrientation.getValue(
              time,
              new Cesium.Quaternion(),
            );
            if (!q) return undefined;
            return Cesium.Quaternion.multiply(
              q,
              leftOffset,
              new Cesium.Quaternion(),
            );
          }, false) as unknown as Cesium.Property,
          model: {
            uri: DATA_URLS.locomotiveModel,
            minimumPixelSize: 32,
            maximumScale: 20_000,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
              0,
              MODEL_MAX_DISTANCE_M,
            ),
          },
          billboard: {
            image: TRAIN_ICON,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            width: 40,
            height: 40,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
              MODEL_MAX_DISTANCE_M,
              Number.MAX_VALUE,
            ),
          },
        });
        entities.push(entity);

        const smokeSystem = new Cesium.ParticleSystem({
          show: showRef.current,
          image: smokeTextureRef.current!,
          startColor: Cesium.Color.WHITE.withAlpha(0.6),
          endColor: Cesium.Color.WHITE.withAlpha(0),
          startScale: 5.0,
          endScale: 15.0,
          minimumParticleLife: 5,
          maximumParticleLife: 9,
          minimumSpeed: 1.0,
          maximumSpeed: 2.0,
          imageSize: new Cesium.Cartesian2(10, 10),
          emissionRate: 8,
          lifetime: 16,
          loop: true,
          emitter: new Cesium.ConeEmitter(Cesium.Math.toRadians(30)),
          modelMatrix: Cesium.Matrix4.IDENTITY.clone(),
          emitterModelMatrix: Cesium.Matrix4.IDENTITY.clone(),
        });

        viewer.scene.primitives.add(smokeSystem);
        particles.push(smokeSystem);

        const near = nearestStation(coords, stations);

        trainInfos.push({
          label: `Locomotive ${idx + 1}`,
          ...(near !== undefined && { nearStation: near }),
          flyTo: makeFlyTo(entity, viewer, trackingRef),
        });
      }

      entitiesRef.current = entities;
      particlesRef.current = particles;
      onTrainsReadyRef.current(trainInfos);

      const onPostUpdate = makePostUpdateHandler(
        entities,
        particles,
        enable3DRef,
        viewer.camera,
      );
      viewer.scene.postUpdate.addEventListener(onPostUpdate);

      cleanupFn = () => {
        trackingRef.current?.();
        viewer.scene.postUpdate.removeEventListener(onPostUpdate);
        for (const e of entities) viewer.entities.remove(e);
        for (const p of particles) viewer.scene.primitives.remove(p);
        entitiesRef.current = [];
        particlesRef.current = [];
        onTrainsReadyRef.current([]);
      };
    };

    run();

    return () => cleanupFn?.();
  }, [viewer]);

  return null;
};
