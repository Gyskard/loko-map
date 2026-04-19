import { describe, it, expect } from "vitest";
import { UIC_REGEX } from "../src/constants.js";

describe("UIC_REGEX", () => {
  it("accepts 8-digit codes", () => {
    expect(UIC_REGEX.test("87113001")).toBe(true);
    expect(UIC_REGEX.test("00000000")).toBe(true);
  });

  it.each([
    ["empty", ""],
    ["too short", "1234567"],
    ["too long", "123456789"],
    ["non-numeric", "12abc678"],
    ["with separator", "1234-5678"],
    ["whitespace", " 87113001 "],
  ])("rejects %s", (_, value) => {
    expect(UIC_REGEX.test(value)).toBe(false);
  });
});
