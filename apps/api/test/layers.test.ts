import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const directoryName = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(directoryName, "../data");

const DATA_FILES = [
  "geojson/lines.geojson",
  "geojson/old_lines.geojson",
  "geojson/stations.geojson",
  "geojson/old_stations.geojson",
  "models/locomotive.glb",
];

describe("layers data files", () => {
  for (const file of DATA_FILES) {
    it(`${file} exists in data/`, () => {
      expect(existsSync(join(DATA_DIR, file))).toBe(true);
    });
  }
});
