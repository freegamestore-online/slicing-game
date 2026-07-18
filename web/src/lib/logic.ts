/**
 * Pure game logic for Beat Star.
 * No React, no Three.js — fully unit-testable.
 */
import type { BeatNote, HitQuality } from "../types";

/** Number of lanes */
export const LANE_COUNT = 4;

/** Y position where notes start (top of screen) */
export const NOTE_SPAWN_Y = 14;

/** Y position of the hit zone (bottom) */
export const HIT_ZONE_Y = -6;

/** Fall speed in world units per second (increases with level) */
export const BASE_FALL_SPEED = 10;

/** Window (in world units) for a "perfect" hit */
export const PERFECT_WINDOW = 0.9;

/** Window (in world units) for a "good" hit */
export const GOOD_WINDOW = 1.8;

/** Points per hit quality */
export const POINTS: Record<HitQuality, number> = {
  perfect: 300,
  good: 100,
  miss: 0,
};

/** Combo multiplier caps at 4x */
export function comboMultiplier(combo: number): number {
  if (combo >= 16) return 4;
  if (combo >= 8) return 3;
  if (combo >= 4) return 2;
  return 1;
}

/** Fall speed for a given level */
export function fallSpeed(level: number): number {
  return BASE_FALL_SPEED + level * 1.5;
}

/** Check hit quality given note Y and hit zone Y */
export function getHitQuality(noteY: number): HitQuality | null {
  const dist = Math.abs(noteY - HIT_ZONE_Y);
  if (dist <= PERFECT_WINDOW) return "perfect";
  if (dist <= GOOD_WINDOW) return "good";
  return null; // too far
}

/** Update a note's Y position */
export function updateNote(note: BeatNote, dt: number, speed: number): BeatNote {
  if (note.hit || note.missed) return note;
  const newY = note.y - speed * dt;
  const missed = newY < HIT_ZONE_Y - GOOD_WINDOW - 0.5;
  return { ...note, y: newY, missed };
}

/** Attempt to hit the note closest to HIT_ZONE_Y in a lane */
export function tryHit(
  notes: BeatNote[],
  lane: number
): { notes: BeatNote[]; quality: HitQuality | null } {
  // Find the unhit note in this lane closest to the hit zone
  let bestIdx = -1;
  let bestDist = Infinity;

  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]!;
    if (n.lane !== lane || n.hit || n.missed) continue;
    const dist = Math.abs(n.y - HIT_ZONE_Y);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }

  if (bestIdx === -1) return { notes, quality: null };

  const note = notes[bestIdx]!;
  const quality = getHitQuality(note.y);
  if (!quality) return { notes, quality: null };

  const updated = notes.map((n, i) =>
    i === bestIdx ? { ...n, hit: true, quality, flashTimer: 0.5 } : n
  );
  return { notes: updated, quality };
}

let noteIdCounter = 0;

/** Generate the next batch of notes for a beat pattern */
export function generateNotes(
  existingNotes: BeatNote[],
  bpm: number,
  level: number,
  songTime: number
): BeatNote[] {
  // How many beats have elapsed
  const beatInterval = 60 / bpm;
  const beatsElapsed = Math.floor(songTime / beatInterval);

  // Generate ahead by 3 beats
  const lookahead = 3;
  const result = [...existingNotes];

  for (let b = beatsElapsed; b <= beatsElapsed + lookahead; b++) {
    const beatTime = b * beatInterval;
    // Check if a note for this beat already exists
    const alreadySpawned = result.some((n) => Math.abs(n.id - b * 100) < 50);
    if (alreadySpawned) continue;

    // How many notes on this beat (1-3 based on level)
    const maxNotes = Math.min(1 + Math.floor(level / 2), 3);
    const noteCount = 1 + Math.floor(Math.random() * maxNotes);

    // Pick unique lanes
    const lanes = shuffleLanes();
    const usedLanes = new Set<number>();

    for (let n = 0; n < noteCount; n++) {
      let lane = -1;
      for (const l of lanes) {
        if (!usedLanes.has(l)) {
          lane = l;
          usedLanes.add(l);
          break;
        }
      }
      if (lane === -1) continue;

      // How far ahead in time is this beat?
      const timeAhead = beatTime - songTime;
      if (timeAhead < 0) continue;

      // Y position based on time ahead * fall speed
      const speed = fallSpeed(level);
      const startY = HIT_ZONE_Y + timeAhead * speed;
      if (startY > NOTE_SPAWN_Y + 20) continue; // too far, skip

      result.push({
        id: noteIdCounter++,
        lane,
        y: Math.max(startY, HIT_ZONE_Y + 2),
        hit: false,
        missed: false,
        quality: null,
        flashTimer: 0,
        colorIdx: lane,
      });
    }
  }

  return result;
}

function shuffleLanes(): number[] {
  const a = [0, 1, 2, 3];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

/** Remove notes that are fully done */
export function cleanupNotes(notes: BeatNote[]): BeatNote[] {
  return notes.filter((n) => {
    if (n.missed) return false;
    if (n.hit && n.flashTimer <= 0) return false;
    return true;
  });
}

/** Star rating based on accuracy percentage */
export function starRating(accuracy: number): number {
  if (accuracy >= 0.95) return 5;
  if (accuracy >= 0.85) return 4;
  if (accuracy >= 0.70) return 3;
  if (accuracy >= 0.50) return 2;
  return 1;
}
