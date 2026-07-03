import { describe, it, expect } from "vitest";
import {
  clamp,
  createKnife,
  updateKnife,
  checkSlice,
  GROUND_Y,
} from "./logic";

describe("clamp", () => {
  it("clamps below min", () => expect(clamp(-5, 0, 10)).toBe(0));
  it("clamps above max", () => expect(clamp(15, 0, 10)).toBe(10));
  it("returns value in range", () => expect(clamp(5, 0, 10)).toBe(5));
});

describe("createKnife", () => {
  it("starts at ground level", () => {
    const k = createKnife();
    expect(k.y).toBe(GROUND_Y);
    expect(k.grounded).toBe(true);
  });
});

describe("updateKnife", () => {
  it("moves forward", () => {
    const k = createKnife();
    const updated = updateKnife(k, 1, false);
    expect(updated.z).toBeLessThan(k.z);
  });

  it("jumps when grounded", () => {
    const k = createKnife();
    const updated = updateKnife(k, 0.016, true);
    expect(updated.vy).toBeGreaterThan(0);
    expect(updated.grounded).toBe(false);
  });
});

describe("checkSlice", () => {
  it("detects collision", () => {
    const k = createKnife();
    const target = {
      id: 0,
      x: 0,
      y: GROUND_Y,
      z: 0,
      type: "apple" as const,
      sliced: false,
      sliceAnim: 0,
      scale: 1,
    };
    expect(checkSlice(k, target)).toBe(true);
  });

  it("ignores already sliced", () => {
    const k = createKnife();
    const target = {
      id: 0,
      x: 0,
      y: GROUND_Y,
      z: 0,
      type: "apple" as const,
      sliced: true,
      sliceAnim: 1,
      scale: 1,
    };
    expect(checkSlice(k, target)).toBe(false);
  });
});
