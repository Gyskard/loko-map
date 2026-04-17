import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../data");

const DATA_FILES = [
  "lines.geojson",
  "old_lines.geojson",
  "stations.geojson",
  "old_stations.geojson",
];

describe("layers data files", () => {
  for (const file of DATA_FILES) {
    it(`${file} exists in data/`, () => {
      expect(existsSync(join(DATA_DIR, file))).toBe(true);
    });
  }
});
