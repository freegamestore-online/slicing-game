export type GamePhase = "menu" | "playing" | "over";

/** A sliceable object on the path */
export interface SliceTarget {
  id: number;
  /** Z position along the path (negative = ahead of knife) */
  z: number;
  /** X offset from center lane */
  x: number;
  /** Y position (height) — some float, some sit on ground */
  y: number;
  /** Type determines appearance and points */
  type: TargetType;
  /** Whether it's been sliced */
  sliced: boolean;
  /** Slice animation progress 0-1 */
  sliceAnim: number;
  /** Size multiplier */
  scale: number;
}

export type TargetType =
  | "watermelon"
  | "apple"
  | "orange"
  | "log"
  | "pineapple"
  | "bomb";

export interface KnifeState {
  /** Current Y position */
  y: number;
  /** Vertical velocity */
  vy: number;
  /** Is on ground */
  grounded: boolean;
  /** Current Z position (moves forward) */
  z: number;
  /** Current rotation (spin while jumping) */
  rotation: number;
  /** Rotation speed */
  rotSpeed: number;
  /** X lane position */
  x: number;
  /** Target X lane */
  targetX: number;
}

export const TARGET_POINTS: Record<TargetType, number> = {
  watermelon: 30,
  pineapple: 25,
  apple: 15,
  orange: 15,
  log: 10,
  bomb: -50,
};

export const TARGET_COLORS: Record<TargetType, { outer: string; inner: string }> = {
  watermelon: { outer: "#2d5a27", inner: "#ff3b5c" },
  apple: { outer: "#cc2222", inner: "#ffffcc" },
  orange: { outer: "#ff8c00", inner: "#ffcc66" },
  log: { outer: "#8B4513", inner: "#DEB887" },
  pineapple: { outer: "#DAA520", inner: "#FFFF99" },
  bomb: { outer: "#333333", inner: "#ff4444" },
};
