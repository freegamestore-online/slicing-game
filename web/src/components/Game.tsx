import { useEffect, useRef, useCallback, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGameSounds } from "@freegamestore/games";
import type { KnifeState, SliceTarget } from "../types";
import { TARGET_COLORS, TARGET_POINTS } from "../types";
import {
  createKnife,
  updateKnife,
  checkSlice,
  spawnTargets,
  cleanupTargets,
  FORWARD_SPEED,
  LANES,
  GROUND_Y,
} from "../lib/logic";

export interface GameProps {
  onScore: (score: number) => void;
  onDistance: (d: number) => void;
  onGameOver: () => void;
  onCombo: (c: number) => void;
}

/* ── Knife Mesh ──────────────────────────────────────────── */
function KnifeMesh({ knifeRef }: { knifeRef: React.RefObject<KnifeState> }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = groupRef.current;
    const k = knifeRef.current;
    if (!g || !k) return;
    g.position.set(k.x, k.y, k.z);
    g.rotation.x = k.rotation;
  });

  return (
    <group ref={groupRef}>
      {/* Blade */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.12, 1.6, 0.5]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Blade edge highlight */}
      <mesh position={[0, 0.4, -0.25]}>
        <boxGeometry args={[0.06, 1.6, 0.02]} />
        <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.1} />
      </mesh>
      {/* Handle */}
      <mesh position={[0, -0.5, 0]} castShadow>
        <boxGeometry args={[0.18, 0.7, 0.35]} />
        <meshStandardMaterial color="#5a3825" roughness={0.8} />
      </mesh>
      {/* Handle wrap */}
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[0.2, 0.15, 0.36]} />
        <meshStandardMaterial color="#8B4513" roughness={0.7} />
      </mesh>
    </group>
  );
}

/* ── Sliceable Target ────────────────────────────────────── */
function TargetMesh({ target }: { target: SliceTarget }) {
  const groupRef = useRef<THREE.Group>(null);
  const colors = TARGET_COLORS[target.type];

  useFrame((_state, dt) => {
    const g = groupRef.current;
    if (!g) return;

    if (target.sliced) {
      // Animate split
      target.sliceAnim = Math.min(target.sliceAnim + dt * 3, 1);
    }

    // Gentle bob for floating targets
    if (!target.sliced && target.y > 1.0) {
      g.position.y = target.y + Math.sin(Date.now() * 0.003 + target.id) * 0.15;
    } else if (!target.sliced) {
      g.position.y = target.y;
    }
  });

  const isBomb = target.type === "bomb";
  const isLog = target.type === "log";

  if (target.sliced && target.sliceAnim >= 0.95) return null;

  return (
    <group
      ref={groupRef}
      position={[target.x, target.y, target.z]}
      scale={target.scale}
    >
      {target.sliced ? (
        <>
          {/* Left half */}
          <group
            position={[-target.sliceAnim * 1.2, -target.sliceAnim * 0.5, 0]}
            rotation={[0, 0, target.sliceAnim * 0.8]}
          >
            <mesh>
              <sphereGeometry args={[0.5, 12, 12, 0, Math.PI]} />
              <meshStandardMaterial color={colors.inner} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.52, 12, 12, Math.PI, Math.PI]} />
              <meshStandardMaterial color={colors.outer} />
            </mesh>
          </group>
          {/* Right half */}
          <group
            position={[target.sliceAnim * 1.2, -target.sliceAnim * 0.5, 0]}
            rotation={[0, 0, -target.sliceAnim * 0.8]}
          >
            <mesh>
              <sphereGeometry args={[0.5, 12, 12, Math.PI, Math.PI]} />
              <meshStandardMaterial color={colors.inner} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.52, 12, 12, 0, Math.PI]} />
              <meshStandardMaterial color={colors.outer} />
            </mesh>
          </group>
        </>
      ) : isBomb ? (
        <group>
          <mesh castShadow>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshStandardMaterial color={colors.outer} />
          </mesh>
          {/* Fuse */}
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.3]} />
            <meshStandardMaterial color="#888" />
          </mesh>
          {/* Spark */}
          <mesh position={[0, 0.72, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial
              color="#ff6600"
              emissive="#ff4400"
              emissiveIntensity={2}
            />
          </mesh>
        </group>
      ) : isLog ? (
        <group rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.45, 0.45, 1.2, 12]} />
            <meshStandardMaterial color={colors.outer} />
          </mesh>
          {/* End rings */}
          <mesh position={[0, 0.61, 0]}>
            <circleGeometry args={[0.44, 12]} />
            <meshStandardMaterial color={colors.inner} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ) : (
        <group>
          <mesh castShadow>
            <sphereGeometry args={[0.55, 16, 16]} />
            <meshStandardMaterial color={colors.outer} />
          </mesh>
          {/* Leaf/stem */}
          {target.type !== "pineapple" && (
            <mesh position={[0, 0.5, 0]}>
              <coneGeometry args={[0.08, 0.2, 6]} />
              <meshStandardMaterial color="#2d5a27" />
            </mesh>
          )}
          {target.type === "pineapple" && (
            <group position={[0, 0.55, 0]}>
              <mesh>
                <coneGeometry args={[0.15, 0.4, 6]} />
                <meshStandardMaterial color="#228B22" />
              </mesh>
              <mesh position={[0.1, 0.1, 0]} rotation={[0, 0, 0.3]}>
                <coneGeometry args={[0.08, 0.25, 4]} />
                <meshStandardMaterial color="#32CD32" />
              </mesh>
            </group>
          )}
        </group>
      )}
    </group>
  );
}

/* ── Ground / Path ───────────────────────────────────────── */
function Ground({ knifeRef }: { knifeRef: React.RefObject<KnifeState> }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const m = meshRef.current;
    const k = knifeRef.current;
    if (!m || !k) return;
    m.position.z = k.z;
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
      <planeGeometry args={[30, 200]} />
      <meshStandardMaterial color="#3a7d44" />
    </mesh>
  );
}

/* ── Lane Lines ──────────────────────────────────────────── */
function LaneLines({ knifeRef }: { knifeRef: React.RefObject<KnifeState> }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = groupRef.current;
    const k = knifeRef.current;
    if (!g || !k) return;
    g.position.z = k.z;
  });

  return (
    <group ref={groupRef}>
      {[-5, -2.5, 0, 2.5, 5].map((x, i) => (
        <mesh
          key={i}
          position={[x, 0.01, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.05, 200]} />
          <meshStandardMaterial
            color="#2d6b35"
            transparent
            opacity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Score Popup ──────────────────────────────────────────── */
function ScorePopups({
  popups,
}: {
  popups: React.RefObject<
    { id: number; x: number; y: number; z: number; text: string; color: string; time: number }[]
  >;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const spritesRef = useRef<Map<number, THREE.Sprite>>(new Map());
  const canvasPool = useRef<Map<number, HTMLCanvasElement>>(new Map());

  useFrame((_state, dt) => {
    const g = groupRef.current;
    const pops = popups.current;
    if (!g || !pops) return;

    // Update existing
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i]!;
      p.time += dt;
      p.y += dt * 2;

      const sprite = spritesRef.current.get(p.id);
      if (sprite) {
        sprite.position.set(p.x, p.y, p.z);
        const mat = sprite.material as THREE.SpriteMaterial;
        mat.opacity = Math.max(0, 1 - p.time / 1.5);
      }

      if (p.time > 1.5) {
        const s = spritesRef.current.get(p.id);
        if (s) {
          g.remove(s);
          s.material.dispose();
          spritesRef.current.delete(p.id);
          canvasPool.current.delete(p.id);
        }
        pops.splice(i, 1);
      }
    }

    // Add new sprites
    for (const p of pops) {
      if (!spritesRef.current.has(p.id)) {
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.font = "bold 40px Manrope, sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, 64, 45);
        }
        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthTest: false,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(2, 1, 1);
        sprite.position.set(p.x, p.y, p.z);
        g.add(sprite);
        spritesRef.current.set(p.id, sprite);
        canvasPool.current.set(p.id, canvas);
      }
    }
  });

  return <group ref={groupRef} />;
}

/* ── Camera Follow ───────────────────────────────────────── */
function CameraRig({ knifeRef }: { knifeRef: React.RefObject<KnifeState> }) {
  const { camera } = useThree();
  const smoothPos = useRef(new THREE.Vector3(0, 6, 8));

  useFrame((_state, dt) => {
    const k = knifeRef.current;
    if (!k) return;

    const targetX = k.x * 0.3;
    const targetY = 6 + k.y * 0.3;
    const targetZ = k.z + 8;

    smoothPos.current.x += (targetX - smoothPos.current.x) * dt * 4;
    smoothPos.current.y += (targetY - smoothPos.current.y) * dt * 4;
    smoothPos.current.z += (targetZ - smoothPos.current.z) * dt * 6;

    camera.position.copy(smoothPos.current);
    camera.lookAt(k.x * 0.5, k.y + 1, k.z - 6);
  });

  return null;
}

/* ── Decorative Trees ────────────────────────────────────── */
function Scenery({ knifeRef }: { knifeRef: React.RefObject<KnifeState> }) {
  const groupRef = useRef<THREE.Group>(null);
  const treesRef = useRef<{ x: number; z: number; s: number; h: number }[]>([]);

  // Generate initial trees
  useMemo(() => {
    const trees: { x: number; z: number; s: number; h: number }[] = [];
    for (let i = 0; i < 60; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      trees.push({
        x: side * (8 + Math.random() * 12),
        z: -i * 8 + Math.random() * 4,
        s: 0.6 + Math.random() * 0.8,
        h: 1.5 + Math.random() * 2,
      });
    }
    treesRef.current = trees;
  }, []);

  useFrame(() => {
    const g = groupRef.current;
    const k = knifeRef.current;
    if (!g || !k) return;

    // Recycle trees that are behind
    for (const t of treesRef.current) {
      if (t.z > k.z + 15) {
        t.z -= 480;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {treesRef.current.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.s}>
          {/* Trunk */}
          <mesh position={[0, t.h / 2, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.2, t.h, 6]} />
            <meshStandardMaterial color="#5a3825" />
          </mesh>
          {/* Foliage */}
          <mesh position={[0, t.h + 0.5, 0]} castShadow>
            <coneGeometry args={[1.2, 2.5, 8]} />
            <meshStandardMaterial color="#1a5c2a" />
          </mesh>
          <mesh position={[0, t.h + 1.5, 0]} castShadow>
            <coneGeometry args={[0.8, 1.8, 8]} />
            <meshStandardMaterial color="#228B22" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── Particle System for Slice Effects ───────────────────── */
function SliceParticles({
  particlesRef,
}: {
  particlesRef: React.RefObject<
    { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; color: string }[]
  >;
}) {
  const instanceRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const MAX = 200;

  useFrame((_state, dt) => {
    const mesh = instanceRef.current;
    const parts = particlesRef.current;
    if (!mesh || !parts) return;

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]!;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 15 * dt;
      p.life -= dt;
      if (p.life <= 0) {
        parts.splice(i, 1);
      }
    }

    for (let i = 0; i < MAX; i++) {
      const p = parts[i];
      if (p) {
        dummy.position.set(p.x, p.y, p.z);
        const s = p.life * 0.3;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      } else {
        dummy.position.set(0, -100, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instanceRef} args={[undefined, undefined, MAX]}>
      <boxGeometry args={[0.15, 0.15, 0.15]} />
      <meshStandardMaterial color="#ff6b6b" />
    </instancedMesh>
  );
}

/* ── Main Scene ──────────────────────────────────────────── */
function Scene({ onScore, onDistance, onGameOver, onCombo }: GameProps) {
  const knifeRef = useRef<KnifeState>(createKnife());
  const targetsRef = useRef<SliceTarget[]>([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const comboTimerRef = useRef(0);
  const distRef = useRef(0);
  const gameOverRef = useRef(false);
  const jumpPressed = useRef(false);
  const swipeRef = useRef<{ startX: number; startY: number; time: number } | null>(null);
  const popupsRef = useRef<
    { id: number; x: number; y: number; z: number; text: string; color: string; time: number }[]
  >([]);
  const particlesRef = useRef<
    { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; color: string }[]
  >([]);
  const popupId = useRef(0);
  const speedMultiplier = useRef(1);
  const livesRef = useRef(3);
  const { play } = useGameSounds();

  // Input handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOverRef.current) return;
      const k = knifeRef.current;
      if (!k) return;
      if (e.code === "Space" || e.code === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        jumpPressed.current = true;
      }
      if (e.code === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        const idx = LANES.indexOf(k.targetX);
        if (idx > 0) k.targetX = LANES[idx - 1]!;
      }
      if (e.code === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        const idx = LANES.indexOf(k.targetX);
        if (idx < LANES.length - 1) k.targetX = LANES[idx + 1]!;
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (gameOverRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      swipeRef.current = { startX: touch.clientX, startY: touch.clientY, time: Date.now() };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (gameOverRef.current) return;
      const touch = e.changedTouches[0];
      const start = swipeRef.current;
      if (!touch || !start) return;

      const dx = touch.clientX - start.startX;
      const dy = touch.clientY - start.startY;
      const dt = Date.now() - start.time;
      const k = knifeRef.current;
      if (!k) return;

      if (dt < 300 && Math.abs(dx) < 30 && Math.abs(dy) < 30) {
        // Tap = jump
        jumpPressed.current = true;
      } else if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
        // Horizontal swipe = lane change
        const idx = LANES.indexOf(k.targetX);
        if (dx < 0 && idx > 0) k.targetX = LANES[idx - 1]!;
        if (dx > 0 && idx < LANES.length - 1) k.targetX = LANES[idx + 1]!;
      } else if (dy < -30) {
        // Swipe up = jump
        jumpPressed.current = true;
      }

      swipeRef.current = null;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  // Spawn particles on slice
  const spawnSliceParticles = useCallback(
    (x: number, y: number, z: number, color: string) => {
      const parts = particlesRef.current;
      if (!parts) return;
      for (let i = 0; i < 12; i++) {
        parts.push({
          x,
          y,
          z,
          vx: (Math.random() - 0.5) * 8,
          vy: Math.random() * 6 + 2,
          vz: (Math.random() - 0.5) * 8,
          life: 0.8 + Math.random() * 0.5,
          color,
        });
      }
    },
    []
  );

  // Main game loop
  useFrame((_state, dt) => {
    if (gameOverRef.current) return;

    const clampedDt = Math.min(dt, 0.1);

    // Update knife
    const jumping = jumpPressed.current;
    jumpPressed.current = false;
    knifeRef.current = updateKnife(knifeRef.current, clampedDt, jumping);

    const knife = knifeRef.current;

    // Track distance
    distRef.current = Math.abs(knife.z);
    onDistance(Math.floor(distRef.current));

    // Speed increases with distance
    speedMultiplier.current = 1 + distRef.current * 0.001;

    // Combo timer
    if (comboRef.current > 0) {
      comboTimerRef.current -= clampedDt;
      if (comboTimerRef.current <= 0) {
        comboRef.current = 0;
        onCombo(0);
      }
    }

    // Spawn targets
    targetsRef.current = spawnTargets(
      targetsRef.current,
      knife.z,
      speedMultiplier.current
    );

    // Check collisions
    for (const target of targetsRef.current) {
      if (target.sliced) continue;
      if (checkSlice(knife, target)) {
        target.sliced = true;
        target.sliceAnim = 0;

        const points = TARGET_POINTS[target.type];

        if (target.type === "bomb") {
          // Hit a bomb!
          livesRef.current -= 1;
          play("error");
          spawnSliceParticles(target.x, target.y, target.z, "#ff4444");
          popupsRef.current.push({
            id: popupId.current++,
            x: target.x,
            y: target.y + 1,
            z: target.z,
            text: "BOMB! 💥",
            color: "#ff4444",
            time: 0,
          });
          comboRef.current = 0;
          onCombo(0);

          if (livesRef.current <= 0) {
            gameOverRef.current = true;
            onGameOver();
            return;
          }
        } else {
          // Good slice!
          comboRef.current += 1;
          comboTimerRef.current = 2;
          onCombo(comboRef.current);

          const multiplier = Math.min(comboRef.current, 5);
          const earned = points * multiplier;
          scoreRef.current += earned;
          onScore(scoreRef.current);

          play("score");
          spawnSliceParticles(
            target.x,
            target.y,
            target.z,
            TARGET_COLORS[target.type].inner
          );

          const comboText =
            multiplier > 1 ? ` x${multiplier}` : "";
          popupsRef.current.push({
            id: popupId.current++,
            x: target.x,
            y: target.y + 1,
            z: target.z,
            text: `+${earned}${comboText}`,
            color: multiplier >= 3 ? "#ffd700" : "#ffffff",
            time: 0,
          });
        }
      }
    }

    // Cleanup
    targetsRef.current = cleanupTargets(targetsRef.current, knife.z);
  });

  // Render targets
  const targets = targetsRef.current;

  return (
    <>
      <CameraRig knifeRef={knifeRef} />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 15, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={100}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {/* Sky color */}
      <fog attach="fog" args={["#87CEEB", 30, 80]} />

      {/* Ground */}
      <Ground knifeRef={knifeRef} />
      <LaneLines knifeRef={knifeRef} />

      {/* Scenery */}
      <Scenery knifeRef={knifeRef} />

      {/* Knife */}
      <KnifeMesh knifeRef={knifeRef} />

      {/* Targets */}
      {targets.map((t) => (
        <TargetMesh key={t.id} target={t} />
      ))}

      {/* Score Popups */}
      <ScorePopups popups={popupsRef} />

      {/* Particles */}
      <SliceParticles particlesRef={particlesRef} />
    </>
  );
}

/* ── Exported Game component ─────────────────────────────── */
export function Game({ onScore, onDistance, onGameOver, onCombo }: GameProps) {
  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        gl={{ antialias: true }}
        camera={{ position: [0, 6, 8], fov: 60 }}
        style={{ background: "linear-gradient(180deg, #87CEEB 0%, #b8e6ff 100%)" }}
      >
        <Scene
          onScore={onScore}
          onDistance={onDistance}
          onGameOver={onGameOver}
          onCombo={onCombo}
        />
      </Canvas>
    </div>
  );
}
