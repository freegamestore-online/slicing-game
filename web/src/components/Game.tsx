import { useEffect, useRef, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { BeatNote, HitEffect, HitQuality } from "../types";
import {
  LANE_COUNT,
  HIT_ZONE_Y,
  NOTE_SPAWN_Y,
  fallSpeed,
  tryHit,
  updateNote,
  generateNotes,
  cleanupNotes,
  comboMultiplier,
  POINTS,
  starRating,
} from "../lib/logic";

export interface GameProps {
  bpm: number;
  level: number;
  songDuration: number;
  onScore: (score: number) => void;
  onCombo: (combo: number) => void;
  onHit: (quality: HitQuality) => void;
  onGameOver: (stars: number, accuracy: number) => void;
}

/* ─── Constants ─────────────────────────────────────────── */

const LANE_COLORS = ["#ff4d8d", "#4daaff", "#ffe14d", "#4dff99"];
const LANE_X = [-4.5, -1.5, 1.5, 4.5];

/* ─── Lane Tracks ────────────────────────────────────────── */

function LaneTracks({ flashRef }: { flashRef: React.RefObject<number[]> }) {
  const matRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([null, null, null, null]);

  useFrame((_state, dt) => {
    const flashes = flashRef.current;
    if (!flashes) return;
    for (let i = 0; i < LANE_COUNT; i++) {
      flashes[i] = Math.max(0, (flashes[i] ?? 0) - dt * 3);
      const mat = matRefs.current[i];
      if (mat) {
        const f = flashes[i] ?? 0;
        mat.emissiveIntensity = f * 1.2;
        mat.opacity = 0.18 + f * 0.35;
      }
    }
  });

  const trackHeight = NOTE_SPAWN_Y - HIT_ZONE_Y + 2;
  const midY = (NOTE_SPAWN_Y + HIT_ZONE_Y) / 2;

  return (
    <group>
      {LANE_X.map((x, i) => {
        const color = LANE_COLORS[i]!;
        return (
          <group key={i}>
            <mesh position={[x, midY, -0.3]}>
              <planeGeometry args={[1.6, trackHeight]} />
              <meshStandardMaterial
                ref={(m) => { matRefs.current[i] = m; }}
                color={color}
                emissive={color}
                emissiveIntensity={0}
                transparent
                opacity={0.18}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh position={[x - 0.8, midY, -0.25]}>
              <planeGeometry args={[0.04, trackHeight]} />
              <meshStandardMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[x + 0.8, midY, -0.25]}>
              <planeGeometry args={[0.04, trackHeight]} />
              <meshStandardMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ─── Hit Zone ───────────────────────────────────────────── */

function HitZone({
  beatRef,
}: {
  beatRef: React.RefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const beat = beatRef.current ?? 0;
    g.scale.setScalar(1 + beat * 0.08);
  });

  return (
    <group ref={groupRef} position={[0, HIT_ZONE_Y, 0]}>
      {LANE_X.map((x, i) => {
        const color = LANE_COLORS[i]!;
        return (
          <group key={i}>
            <mesh position={[x, 0, 0]}>
              <torusGeometry args={[0.65, 0.08, 8, 24]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
            </mesh>
            <mesh position={[x, 0, 0]}>
              <circleGeometry args={[0.5, 24]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.3}
                transparent
                opacity={0.3}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, -0.15, -0.4]}>
        <boxGeometry args={[13, 0.25, 1.2]} />
        <meshStandardMaterial color="#1a1a2e" emissive="#2a2a4e" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

/* ─── Hit Effects ────────────────────────────────────────── */

function HitEffects({ effectsRef }: { effectsRef: React.RefObject<HitEffect[]> }) {
  const groupRef = useRef<THREE.Group>(null);
  const spritesRef = useRef<Map<number, THREE.Group>>(new Map());

  useFrame((_state, dt) => {
    const g = groupRef.current;
    const effects = effectsRef.current;
    if (!g || !effects) return;

    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i]!;
      e.timer -= dt;
      e.y += dt * 2.5;

      const grp = spritesRef.current.get(e.id);
      if (grp) {
        grp.position.y = e.y;
        const progress = 1 - e.timer / 0.8;
        grp.scale.setScalar(1 + progress * 0.5);
        grp.children.forEach((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            (mesh.material as THREE.MeshStandardMaterial).opacity = Math.max(0, e.timer / 0.8);
          }
        });
      }

      if (e.timer <= 0) {
        const dead = spritesRef.current.get(e.id);
        if (dead) { g.remove(dead); spritesRef.current.delete(e.id); }
        effects.splice(i, 1);
      }
    }

    for (const e of effects) {
      if (spritesRef.current.has(e.id)) continue;
      const x = LANE_X[e.lane] ?? 0;
      const color = e.quality === "perfect" ? "#ffd700" : e.quality === "good" ? "#4daaff" : "#ff4444";
      const grp = new THREE.Group();
      grp.position.set(x, e.y, 0.5);
      for (let r = 0; r < 3; r++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.3 + r * 0.3, 0.06, 6, 20),
          new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1, transparent: true, opacity: 0.9 })
        );
        ring.rotation.x = Math.PI / 2;
        grp.add(ring);
      }
      g.add(grp);
      spritesRef.current.set(e.id, grp);
    }
  });

  return <group ref={groupRef} />;
}

/* ─── Background Stars ───────────────────────────────────── */

function BackgroundStars() {
  const groupRef = useRef<THREE.Group>(null);
  const starsData = useRef<{ x: number; y: number; z: number; speed: number; phase: number }[]>([]);

  if (starsData.current.length === 0) {
    for (let i = 0; i < 80; i++) {
      starsData.current.push({
        x: (Math.random() - 0.5) * 30,
        y: (Math.random() - 0.5) * 30,
        z: -2 - Math.random() * 8,
        speed: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.children.forEach((child, i) => {
      const d = starsData.current[i];
      if (!d) return;
      child.position.y = d.y + Math.sin(t * d.speed + d.phase) * 0.5;
      child.scale.setScalar(0.5 + Math.sin(t * d.speed * 2 + d.phase) * 0.2);
    });
  });

  return (
    <group ref={groupRef}>
      {starsData.current.map((d, i) => (
        <mesh key={i} position={[d.x, d.y, d.z]}>
          <boxGeometry args={[0.12, 0.12, 0.12]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/* ─── Beat Light ─────────────────────────────────────────── */

function BeatLight({ beatRef }: { beatRef: React.RefObject<number> }) {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((_state, dt) => {
    const light = lightRef.current;
    if (!light) return;
    if ((beatRef.current ?? 0) > 0) beatRef.current = Math.max(0, (beatRef.current ?? 0) - dt * 5);
    light.intensity = 0.5 + (beatRef.current ?? 0) * 2.5;
  });

  return <pointLight ref={lightRef} position={[0, HIT_ZONE_Y + 2, 3]} color="#ffffff" intensity={0.5} distance={20} />;
}

/* ─── Note Animator ──────────────────────────────────────── */

function NoteAnimator({
  notesRef,
  noteGroupsRef,
}: {
  notesRef: React.RefObject<BeatNote[]>;
  noteGroupsRef: React.RefObject<Map<number, THREE.Group>>;
}) {
  useFrame((state) => {
    const notes = notesRef.current;
    const groups = noteGroupsRef.current;
    if (!notes || !groups) return;
    const t = state.clock.elapsedTime;

    for (const note of notes) {
      const g = groups.get(note.id);
      if (!g) continue;
      g.position.y = note.y;
      if (note.hit) {
        g.scale.setScalar(Math.max(0, note.flashTimer / 0.5));
        g.rotation.z += 0.15;
      } else if (!note.missed) {
        g.rotation.z = t * 2 + note.id * 0.7;
        g.rotation.y = t * 1.5 + note.id * 0.5;
        const glow = Math.max(0, 1 - Math.abs(note.y - HIT_ZONE_Y) / 4);
        g.children.forEach((child) => {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
          if (mat?.emissiveIntensity !== undefined) mat.emissiveIntensity = 0.4 + glow * 1.2;
        });
      }
    }
  });

  return null;
}

/* ─── Note Renderer ──────────────────────────────────────── */

function NoteRenderer({
  notesRef,
  noteGroupsRef,
}: {
  notesRef: React.RefObject<BeatNote[]>;
  noteGroupsRef: React.RefObject<Map<number, THREE.Group>>;
}) {
  const renderedIds = useRef<Set<number>>(new Set());
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = groupRef.current;
    const notes = notesRef.current;
    const groups = noteGroupsRef.current;
    if (!g || !notes) return;

    const currentIds = new Set(notes.map((n) => n.id));

    for (const id of renderedIds.current) {
      if (!currentIds.has(id)) {
        const existing = groups.get(id);
        if (existing) { g.remove(existing); groups.delete(id); }
        renderedIds.current.delete(id);
      }
    }

    for (const note of notes) {
      if (renderedIds.current.has(note.id)) continue;
      const color = LANE_COLORS[note.colorIdx % LANE_COLORS.length]!;
      const x = LANE_X[note.lane] ?? 0;
      const noteGroup = new THREE.Group();
      noteGroup.position.set(x, note.y, 0);

      noteGroup.add(new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 12, 12),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, transparent: true, opacity: 0.25 })
      ));

      const starMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 });
      noteGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.25), starMat));

      const box2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.22), starMat.clone());
      box2.rotation.z = Math.PI / 4;
      noteGroup.add(box2);

      noteGroup.add(new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 8),
        new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 1.5 })
      ));

      g.add(noteGroup);
      groups.set(note.id, noteGroup);
      renderedIds.current.add(note.id);
    }
  });

  return <group ref={groupRef} />;
}

/* ─── Game Loop ──────────────────────────────────────────── */

function GameLoop({
  bpm,
  level,
  songDuration,
  onScore,
  onCombo,
  onHit,
  onGameOver,
  laneFlashRef,
  beatRef,
  effectsRef,
  notesRef,
  laneHitRef,
}: {
  bpm: number;
  level: number;
  songDuration: number;
  onScore: (s: number) => void;
  onCombo: (c: number) => void;
  onHit: (q: HitQuality) => void;
  onGameOver: (stars: number, acc: number) => void;
  laneFlashRef: React.RefObject<number[]>;
  beatRef: React.RefObject<number>;
  effectsRef: React.RefObject<HitEffect[]>;
  notesRef: React.RefObject<BeatNote[]>;
  laneHitRef: React.RefObject<boolean[]>;
}) {
  const songTimeRef = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const totalNotesRef = useRef(0);
  const hitNotesRef = useRef(0);
  const effectIdRef = useRef(0);
  const doneRef = useRef(false);
  const lastBeatRef = useRef(-1);

  useFrame((_state, dt) => {
    if (doneRef.current) return;
    const clampedDt = Math.min(dt, 0.05);
    songTimeRef.current += clampedDt;
    const songTime = songTimeRef.current;
    const speed = fallSpeed(level);

    // Beat pulse
    const beatInterval = 60 / bpm;
    const currentBeat = Math.floor(songTime / beatInterval);
    if (currentBeat !== lastBeatRef.current) {
      lastBeatRef.current = currentBeat;
      beatRef.current = 1;
    }

    // Generate + update notes
    notesRef.current = generateNotes(notesRef.current, bpm, level, songTime);
    const updatedNotes: BeatNote[] = [];
    for (const note of notesRef.current) {
      const updated = updateNote(note, clampedDt, speed);
      if (!note.missed && updated.missed) {
        totalNotesRef.current += 1;
        comboRef.current = 0;
        onCombo(0);
        onHit("miss");
      }
      if (updated.hit) updated.flashTimer = Math.max(0, updated.flashTimer - clampedDt);
      updatedNotes.push(updated);
    }
    notesRef.current = cleanupNotes(updatedNotes);

    // Process hits
    const laneHits = laneHitRef.current;
    if (laneHits) {
      for (let lane = 0; lane < LANE_COUNT; lane++) {
        if (!laneHits[lane]) continue;
        laneHits[lane] = false;
        const { notes: newNotes, quality } = tryHit(notesRef.current, lane);
        notesRef.current = newNotes;
        if (quality) {
          totalNotesRef.current += 1;
          hitNotesRef.current += 1;
          comboRef.current += 1;
          const pts = POINTS[quality] * comboMultiplier(comboRef.current);
          scoreRef.current += pts;
          onScore(scoreRef.current);
          onCombo(comboRef.current);
          onHit(quality);
          if (laneFlashRef.current) laneFlashRef.current[lane] = 1;
          effectsRef.current.push({ id: effectIdRef.current++, lane, quality, timer: 0.8, y: HIT_ZONE_Y });
        }
      }
    }

    // End
    if (songTime >= songDuration) {
      doneRef.current = true;
      const acc = hitNotesRef.current / Math.max(1, totalNotesRef.current);
      onGameOver(starRating(acc), acc);
    }
  });

  return null;
}

/* ─── Exported Game Component ────────────────────────────── */

export function Game({ bpm, level, songDuration, onScore, onCombo, onHit, onGameOver }: GameProps) {
  const laneFlashRef = useRef<number[]>([0, 0, 0, 0]);
  const beatRef = useRef<number>(0);
  const effectsRef = useRef<HitEffect[]>([]);
  const notesRef = useRef<BeatNote[]>([]);
  const noteGroupsRef = useRef<Map<number, THREE.Group>>(new Map());
  const laneHitRef = useRef<boolean[]>([false, false, false, false]);

  useEffect(() => {
    const keyMap: Record<string, number> = {
      d: 0, D: 0, ArrowLeft: 0,
      f: 1, F: 1, ArrowDown: 1,
      j: 2, J: 2, ArrowUp: 2,
      k: 3, K: 3, ArrowRight: 3,
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      const lane = keyMap[e.key];
      if (lane !== undefined) { e.preventDefault(); laneHitRef.current[lane] = true; }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLaneTap = useCallback((lane: number) => {
    laneHitRef.current[lane] = true;
  }, []);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 relative">
        <Canvas
          camera={{ position: [0, 0, 18], fov: 55 }}
          style={{ background: "linear-gradient(180deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a2e 100%)" }}
        >
          {/* Lighting */}
          <ambientLight intensity={0.4} color="#8888ff" />
          <directionalLight position={[0, 10, 5]} intensity={0.8} />
          <directionalLight position={[0, -5, 5]} intensity={0.3} color="#aaaaff" />
          <BeatLight beatRef={beatRef} />

          {/* Scene */}
          <BackgroundStars />
          <LaneTracks flashRef={laneFlashRef} />
          <HitZone beatRef={beatRef} />
          <HitEffects effectsRef={effectsRef} />
          <NoteRenderer notesRef={notesRef} noteGroupsRef={noteGroupsRef} />
          <NoteAnimator notesRef={notesRef} noteGroupsRef={noteGroupsRef} />

          {/* Logic */}
          <GameLoop
            bpm={bpm}
            level={level}
            songDuration={songDuration}
            onScore={onScore}
            onCombo={onCombo}
            onHit={onHit}
            onGameOver={onGameOver}
            laneFlashRef={laneFlashRef}
            beatRef={beatRef}
            effectsRef={effectsRef}
            notesRef={notesRef}
            laneHitRef={laneHitRef}
          />
        </Canvas>
      </div>

      {/* Touch buttons */}
      <div className="flex w-full" style={{ height: "80px", flexShrink: 0 }}>
        {([0, 1, 2, 3] as const).map((lane) => {
          const color = LANE_COLORS[lane]!;
          const labels = ["D", "F", "J", "K"];
          return (
            <button
              key={lane}
              onPointerDown={() => handleLaneTap(lane)}
              className="flex-1 flex items-center justify-center font-bold text-lg select-none active:scale-95 transition-transform"
              style={{
                background: `${color}22`,
                borderTop: `3px solid ${color}`,
                color,
                touchAction: "manipulation",
                minHeight: "44px",
                fontFamily: "Manrope, sans-serif",
              }}
            >
              {labels[lane]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
