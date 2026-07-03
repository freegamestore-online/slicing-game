/**
 * Pure game logic for the knife slicing game.
 */
import type { KnifeState, SliceTarget, TargetType } from "../types";

/** Gravity acceleration */
export const GRAVITY = -28;
/** Jump velocity */
export const JUMP_VELOCITY = 14;
/** Forward speed (units/sec) */
export const FORWARD_SPEED = 12;
/** Ground Y level */
export const GROUND_Y = 0.5;
/** How close the knife must be to slice */
export const SLICE_RADIUS_XZ = 1.5;
export const SLICE_RADIUS_Y = 1.2;
/** Lane positions */
export const LANES = [-2.5, 0, 2.5];
/** Lane switch speed */
export const LANE_SPEED = 15;
/** Spawn distance ahead */
export const SPAWN_AHEAD = 80;
/** Despawn distance behind */
export const DESPAWN_BEHIND = 10;
/** Min gap between targets on same lane */
export const MIN_GAP = 6;

const TARGET_TYPES: TargetType[] = [
  "watermelon",
  "apple",
  "orange",
  "log",
  "pineapple",
  "bomb",
];

const TARGET_WEIGHTS: number[] = [15, 25, 25, 15, 10, 10];

export function randomTargetType(): TargetType {
  const total = TARGET_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < TARGET_TYPES.length; i++) {
    r -= TARGET_WEIGHTS[i]!;
    if (r <= 0) return TARGET_TYPES[i]!;
  }
  return "apple";
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function createKnife(): KnifeState {
  return {
    y: GROUND_Y,
    vy: 0,
    grounded: true,
    z: 0,
    rotation: 0,
    rotSpeed: 0,
    x: 0,
    targetX: 0,
  };
}

export function updateKnife(knife: KnifeState, dt: number, jumping: boolean): KnifeState {
  let { y, vy, grounded, z, rotation, rotSpeed, x, targetX } = knife;

  // Forward movement
  z -= FORWARD_SPEED * dt;

  // Jump
  if (jumping && grounded) {
    vy = JUMP_VELOCITY;
    grounded = false;
    rotSpeed = -12; // spin while airborne
  }

  // Gravity
  if (!grounded) {
    vy += GRAVITY * dt;
    y += vy * dt;
    rotation += rotSpeed * dt;

    if (y <= GROUND_Y) {
      y = GROUND_Y;
      vy = 0;
      grounded = true;
      rotSpeed = 0;
      // Snap rotation to nearest full rotation
      rotation = Math.round(rotation / (Math.PI * 2)) * Math.PI * 2;
    }
  }

  // Lane movement
  const dx = targetX - x;
  if (Math.abs(dx) > 0.05) {
    x += Math.sign(dx) * LANE_SPEED * dt;
    if (Math.abs(targetX - x) < 0.1) x = targetX;
  } else {
    x = targetX;
  }

  return { y, vy, grounded, z, rotation, rotSpeed, x, targetX };
}

export function checkSlice(
  knife: KnifeState,
  target: SliceTarget
): boolean {
  if (target.sliced) return false;
  const dz = Math.abs(knife.z - target.z);
  const dx = Math.abs(knife.x - target.x);
  const dy = Math.abs(knife.y - target.y);
  return dz < SLICE_RADIUS_XZ && dx < SLICE_RADIUS_XZ && dy < SLICE_RADIUS_Y;
}

let nextId = 0;

export function spawnTargets(
  existing: SliceTarget[],
  knifeZ: number,
  speedMultiplier: number
): SliceTarget[] {
  const result = [...existing];
  const spawnZ = knifeZ - SPAWN_AHEAD;

  // For each lane, check if we need to spawn
  for (const laneX of LANES) {
    const laneTargets = result.filter(
      (t) => Math.abs(t.x - laneX) < 0.5 && !t.sliced
    );
    const furthest = laneTargets.reduce(
      (min, t) => (t.z < min ? t.z : min),
      knifeZ
    );

    if (furthest > spawnZ + MIN_GAP * 2) {
      // Spawn a cluster
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const type = randomTargetType();
        const gap = MIN_GAP + Math.random() * (4 / speedMultiplier);
        const z = furthest - gap * (i + 1);
        const isFloating = Math.random() > 0.6 && type !== "log";
        const baseScale =
          type === "watermelon"
            ? 1.2
            : type === "pineapple"
              ? 1.0
              : type === "log"
                ? 1.3
                : type === "bomb"
                  ? 0.8
                  : 0.9;
        result.push({
          id: nextId++,
          z,
          x: laneX,
          y: isFloating ? 1.5 + Math.random() * 2 : 0.8,
          type,
          sliced: false,
          sliceAnim: 0,
          scale: baseScale + Math.random() * 0.3,
        });
      }
    }
  }

  return result;
}

export function cleanupTargets(
  targets: SliceTarget[],
  knifeZ: number
): SliceTarget[] {
  return targets.filter(
    (t) => t.z < knifeZ + DESPAWN_BEHIND && t.z > knifeZ - SPAWN_AHEAD - 20
  );
}
