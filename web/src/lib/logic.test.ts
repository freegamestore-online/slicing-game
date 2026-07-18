import { describe, it, expect } from "vitest";
import {
  getHitQuality,
  comboMultiplier,
  fallSpeed,
  tryHit,
  starRating,
  HIT_ZONE_Y,
  PERFECT_WINDOW,
  GOOD_WINDOW,
  BASE_FALL_SPEED,
} from "./logic";
import type { BeatNote } from "../types";

function makeNote(id: number, lane: number, y: number): BeatNote {
  return { id, lane, y, hit: false, missed: false, quality: null, flashTimer: 0, colorIdx: lane };
}

describe("getHitQuality", () => {
  it("returns perfect when note is at hit zone", () => {
    expect(getHitQuality(HIT_ZONE_Y)).toBe("perfect");
  });
  it("returns perfect within window", () => {
    expect(getHitQuality(HIT_ZONE_Y + PERFECT_WINDOW - 0.1)).toBe("perfect");
  });
  it("returns good just outside perfect window", () => {
    expect(getHitQuality(HIT_ZONE_Y + PERFECT_WINDOW + 0.1)).toBe("good");
  });
  it("returns good within good window", () => {
    expect(getHitQuality(HIT_ZONE_Y + GOOD_WINDOW - 0.1)).toBe("good");
  });
  it("returns null outside good window", () => {
    expect(getHitQuality(HIT_ZONE_Y + GOOD_WINDOW + 1)).toBeNull();
  });
});

describe("comboMultiplier", () => {
  it("returns 1 for low combo", () => expect(comboMultiplier(2)).toBe(1));
  it("returns 2 for combo >= 4", () => expect(comboMultiplier(4)).toBe(2));
  it("returns 3 for combo >= 8", () => expect(comboMultiplier(8)).toBe(3));
  it("returns 4 for combo >= 16", () => expect(comboMultiplier(16)).toBe(4));
});

describe("fallSpeed", () => {
  it("increases with level", () => {
    expect(fallSpeed(1)).toBeGreaterThan(BASE_FALL_SPEED);
    expect(fallSpeed(5)).toBeGreaterThan(fallSpeed(1));
  });
});

describe("tryHit", () => {
  it("hits the closest note in the lane", () => {
    const notes = [
      makeNote(0, 0, HIT_ZONE_Y + 0.5),
      makeNote(1, 1, HIT_ZONE_Y + 0.5),
    ];
    const { notes: updated, quality } = tryHit(notes, 0);
    expect(quality).toBe("perfect");
    expect(updated[0]!.hit).toBe(true);
    expect(updated[1]!.hit).toBe(false);
  });

  it("returns null quality when no note in range", () => {
    const notes = [makeNote(0, 0, HIT_ZONE_Y + 10)];
    const { quality } = tryHit(notes, 0);
    expect(quality).toBeNull();
  });

  it("ignores already-hit notes", () => {
    const notes = [{ ...makeNote(0, 0, HIT_ZONE_Y), hit: true }];
    const { quality } = tryHit(notes, 0);
    expect(quality).toBeNull();
  });
});

describe("starRating", () => {
  it("5 stars for 95%+", () => expect(starRating(0.97)).toBe(5));
  it("4 stars for 85%+", () => expect(starRating(0.88)).toBe(4));
  it("3 stars for 70%+", () => expect(starRating(0.72)).toBe(3));
  it("2 stars for 50%+", () => expect(starRating(0.55)).toBe(2));
  it("1 star below 50%", () => expect(starRating(0.3)).toBe(1));
});
