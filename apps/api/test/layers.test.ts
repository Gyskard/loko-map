import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { LAYERS } from "@loko-map/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../data");

describe("layers data files", () => {
  for (const { id, file } of LAYERS) {
    it(`${id}: ${file} exists in data/`, () => {
      expect(existsSync(join(DATA_DIR, file))).toBe(true);
    });
  }
});
