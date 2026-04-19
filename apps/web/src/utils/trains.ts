import * as Cesium from "cesium";
import { haversineKm } from "./stats";
import { CLOCK_LOOP_S } from "@/constants";

export { CLOCK_LOOP_S };

const SPEED_KM_S = 40 / 3600;

export const buildPositionProperty = (
  coords: number[][],
  startTime: Cesium.JulianDate,
  startFraction: number,
): Cesium.SampledPositionProperty => {
  // Ping pong system to deal with the end of the tracks
  // In real life it's a little bit more complicating to reverse the direction of a train
  // I don't know why sometimes it will do ping pong
  // in the middle of tracks, can be a surprise for the conductor
  const pingPong =
    coords.length > 2
      ? [...coords, ...coords.slice(1, -1).reverse()]
      : [...coords, ...[...coords].reverse().slice(1)];

  const times: number[] = [0];

  // Get the time needed for the train to do the trip along a track
  for (let i = 1; i < pingPong.length; i++) {
    times.push(
      times[i - 1]! +
        haversineKm(
          pingPong[i - 1]![0]!,
          pingPong[i - 1]![1]!,
          pingPong[i]![0]!,
          pingPong[i]![1]!,
        ) /
          SPEED_KM_S,
    );
  }

  // Repeat the animation after the end of this duration
  const cycleDurationS = times[times.length - 1] ?? 1;

  const prop = new Cesium.SampledPositionProperty();

  prop.setInterpolationOptions({
    interpolationDegree: 1,
    interpolationAlgorithm: Cesium.LinearApproximation,
  });

  // Don't start at the beginning of a track
  let base = -(startFraction * cycleDurationS);

  // Set keyframes for the full 1-hour animation so Cesium can interpolate positions during playback
  while (base < CLOCK_LOOP_S + cycleDurationS) {
    for (let i = 0; i < pingPong.length; i++) {
      const pt = pingPong[i]!;
      prop.addSample(
        Cesium.JulianDate.addSeconds(
          startTime,
          base + times[i]!,
          new Cesium.JulianDate(),
        ),
        Cesium.Cartesian3.fromDegrees(pt[0]!, pt[1]!, 2),
      );
    }
    base += cycleDurationS;
  }

  return prop;
};
