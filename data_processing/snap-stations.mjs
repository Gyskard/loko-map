import { readFileSync, writeFileSync } from "fs";
import nearestPointOnLine from "@turf/nearest-point-on-line";

const MAX_SNAP_DISTANCE_KM = 0.5; // only snap if within 500m

const stations = JSON.parse(readFileSync("stations.geojson", "utf8"));
const lines = JSON.parse(readFileSync("lines.geojson", "utf8"));

let snapped = 0;
let skipped = 0;

const result = {
  ...stations,
  features: stations.features.map((station) => {
    const nearest = nearestPointOnLine(lines, station, { units: "kilometers" });
    const dist = nearest.properties.dist;

    if (dist <= MAX_SNAP_DISTANCE_KM) {
      snapped++;
      return {
        ...station,
        geometry: nearest.geometry,
      };
    } else {
      skipped++;
      return station;
    }
  }),
};

writeFileSync("stations_snapped.geojson", JSON.stringify(result));
console.log(`Done: ${snapped} snapped, ${skipped} skipped (> ${MAX_SNAP_DISTANCE_KM}km from any line)`);
