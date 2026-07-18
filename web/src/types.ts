export type GamePhase = "menu" | "playing" | "over";

/** A beat note falling down a lane */
export interface BeatNote {
  id: number;
  /** Lane index 0-3 */
  lane: number;
  /** Y position (starts high, falls to 0) */
  y: number;
  /** Whether it has been hit */
  hit: boolean;
  /** Whether it was missed (passed target zone) */
  missed: boolean;
  /** Hit quality: perfect / good / miss */
  quality: HitQuality | null;
  /** Visual flash timer */
  flashTimer: number;
  /** Color index */
  colorIdx: number;
}

export type HitQuality = "perfect" | "good" | "miss";

export interface HitEffect {
  id: number;
  lane: number;
  quality: HitQuality;
  timer: number;
  y: number;
}
