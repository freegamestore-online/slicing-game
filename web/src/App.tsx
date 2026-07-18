import { useState, useCallback, useRef } from "react";
import { GameShell, GameTopbar } from "@freegamestore/games";
import { Game } from "./components/Game";
import { useHighScore } from "./hooks/useHighScore";
import type { GamePhase } from "./types";
import type { HitQuality } from "./types";

/* ─── Song definitions ──────────────────────────────────── */

interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  duration: number;
  level: number;
  emoji: string;
  color: string;
}

const SONGS: Song[] = [
  {
    id: "groove-time",
    title: "Groove Time",
    artist: "Beat Star",
    bpm: 100,
    duration: 60,
    level: 1,
    emoji: "🎵",
    color: "#ff4d8d",
  },
  {
    id: "star-rush",
    title: "Star Rush",
    artist: "Beat Star",
    bpm: 130,
    duration: 60,
    level: 3,
    emoji: "⭐",
    color: "#4daaff",
  },
  {
    id: "hyper-beat",
    title: "Hyper Beat",
    artist: "Beat Star",
    bpm: 160,
    duration: 60,
    level: 6,
    emoji: "🚀",
    color: "#ffe14d",
  },
];

/* ─── Result Screen ──────────────────────────────────────── */

function ResultScreen({
  score,
  highScore,
  stars,
  accuracy,
  song,
  onReplay,
  onMenu,
}: {
  score: number;
  highScore: number;
  stars: number;
  accuracy: number;
  song: Song;
  onReplay: () => void;
  onMenu: () => void;
}) {
  const isNew = score >= highScore && score > 0;
  const pct = Math.round(accuracy * 100);

  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-4 px-4 py-6"
      style={{ background: "linear-gradient(180deg, #0a0a1a 0%, #1a0a2e 100%)" }}
    >
      {/* Stars */}
      <div className="text-5xl tracking-widest">
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            style={{
              opacity: i < stars ? 1 : 0.2,
              filter: i < stars ? "drop-shadow(0 0 8px #ffd700)" : "none",
              transition: "all 0.3s",
            }}
          >
            ⭐
          </span>
        ))}
      </div>

      <h2
        className="text-4xl font-bold text-center"
        style={{ fontFamily: "Fraunces, serif", color: "#ffffff" }}
      >
        {stars >= 5 ? "Perfect! 🎉" : stars >= 4 ? "Awesome! 🌟" : stars >= 3 ? "Great! 👏" : stars >= 2 ? "Good Try! 💪" : "Keep Going! 🎵"}
      </h2>

      <p style={{ color: "#aaaacc", fontFamily: "Manrope, sans-serif" }}>
        {song.emoji} {song.title}
      </p>

      {/* Score card */}
      <div
        className="w-full max-w-sm rounded-2xl p-5 flex flex-col gap-3"
        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}
      >
        <div className="flex justify-between items-center">
          <span style={{ color: "#aaaacc" }}>Score</span>
          <span className="text-2xl font-bold" style={{ color: "#ffffff" }}>
            {score.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span style={{ color: "#aaaacc" }}>Accuracy</span>
          <span
            className="text-xl font-bold"
            style={{ color: pct >= 90 ? "#ffd700" : pct >= 70 ? "#4dff99" : "#4daaff" }}
          >
            {pct}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span style={{ color: "#aaaacc" }}>Best Score</span>
          <span className="font-bold" style={{ color: isNew ? "#ffd700" : "#ffffff" }}>
            {highScore.toLocaleString()} {isNew && "🆕"}
          </span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 w-full max-w-sm">
        <button
          onClick={onReplay}
          className="flex-1 py-4 rounded-xl font-bold text-lg active:scale-95 transition-transform"
          style={{ background: song.color, color: "#ffffff", minHeight: "56px" }}
        >
          ↺ Replay
        </button>
        <button
          onClick={onMenu}
          className="flex-1 py-4 rounded-xl font-bold text-lg active:scale-95 transition-transform"
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "2px solid rgba(255,255,255,0.3)",
            color: "#ffffff",
            minHeight: "56px",
          }}
        >
          🎵 Songs
        </button>
      </div>
    </div>
  );
}

/* ─── Song Select Screen ─────────────────────────────────── */

function SongSelect({
  songs,
  highScores,
  onSelect,
}: {
  songs: Song[];
  highScores: Record<string, number>;
  onSelect: (song: Song) => void;
}) {
  return (
    <div
      className="flex flex-col items-center h-full px-4 py-6 gap-4 overflow-auto"
      style={{ background: "linear-gradient(180deg, #0a0a1a 0%, #1a0a2e 100%)" }}
    >
      {/* Title */}
      <div className="text-center mb-2">
        <h1
          className="text-5xl font-bold"
          style={{ fontFamily: "Fraunces, serif", color: "#ffffff", textShadow: "0 0 20px #ff4d8d" }}
        >
          ⭐ Beat Star
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#8888aa" }}>
          Hit the stars to the beat!
        </p>
      </div>

      {/* How to play */}
      <div
        className="w-full max-w-md rounded-xl p-3 text-sm"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#aaaacc" }}
      >
        <p className="font-bold mb-1" style={{ color: "#ffffff" }}>🎮 How to Play</p>
        <p><strong style={{ color: "#ff4d8d" }}>D F J K</strong> keys (or tap buttons) — hit stars as they reach the glowing rings!</p>
        <p className="mt-1">⭐ Perfect timing = more points · Build combos for multipliers!</p>
      </div>

      {/* Song list */}
      <div className="w-full max-w-md flex flex-col gap-3">
        {songs.map((song) => {
          const best = highScores[song.id] ?? 0;
          const diffLabel = song.level <= 2 ? "Easy" : song.level <= 5 ? "Medium" : "Hard";
          const diffColor = song.level <= 2 ? "#4dff99" : song.level <= 5 ? "#ffe14d" : "#ff4d8d";
          return (
            <button
              key={song.id}
              onClick={() => onSelect(song)}
              className="w-full text-left rounded-2xl p-4 active:scale-98 transition-transform"
              style={{
                background: `linear-gradient(135deg, ${song.color}22 0%, rgba(255,255,255,0.04) 100%)`,
                border: `2px solid ${song.color}55`,
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-4xl">{song.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg" style={{ color: "#ffffff", fontFamily: "Fraunces, serif" }}>
                      {song.title}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{ background: `${diffColor}33`, color: diffColor }}
                    >
                      {diffLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs" style={{ color: "#8888aa" }}>
                      {song.bpm} BPM
                    </span>
                    {best > 0 && (
                      <span className="text-xs" style={{ color: song.color }}>
                        Best: {best.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-2xl" style={{ color: song.color }}>▶</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-xs mt-auto" style={{ color: "#555577" }}>
        More songs coming soon! 🎶
      </p>
    </div>
  );
}

/* ─── HUD overlay ────────────────────────────────────────── */

function HUD({
  score,
  combo,
  lastHit,
  timeLeft,
  song,
}: {
  score: number;
  combo: number;
  lastHit: HitQuality | null;
  timeLeft: number;
  song: Song;
}) {
  const hitColor =
    lastHit === "perfect" ? "#ffd700" : lastHit === "good" ? "#4daaff" : "#ff4444";
  const hitLabel =
    lastHit === "perfect" ? "PERFECT ✨" : lastHit === "good" ? "GOOD 👍" : lastHit === "miss" ? "MISS" : "";

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col" style={{ top: 0 }}>
      {/* Top bar info */}
      <div className="flex justify-between items-start px-3 pt-2">
        {/* Combo */}
        <div className="text-center">
          {combo >= 4 && (
            <div
              className="font-bold text-2xl"
              style={{
                fontFamily: "Fraunces, serif",
                color: combo >= 16 ? "#ffd700" : combo >= 8 ? "#ff4d8d" : "#4daaff",
                textShadow: "0 0 12px currentColor",
              }}
            >
              {combo}x
            </div>
          )}
          {combo >= 4 && (
            <div className="text-xs font-bold" style={{ color: "#aaaacc" }}>
              COMBO
            </div>
          )}
        </div>

        {/* Timer */}
        <div
          className="text-sm font-bold px-3 py-1 rounded-full"
          style={{
            background: "rgba(0,0,0,0.4)",
            color: timeLeft <= 10 ? "#ff4d8d" : "#aaaacc",
            fontFamily: "Manrope, sans-serif",
          }}
        >
          {Math.ceil(timeLeft)}s
        </div>
      </div>

      {/* Hit quality popup (center) */}
      {hitLabel && (
        <div
          className="absolute left-1/2 -translate-x-1/2 font-bold text-xl pointer-events-none"
          style={{
            top: "30%",
            color: hitColor,
            fontFamily: "Fraunces, serif",
            textShadow: `0 0 12px ${hitColor}`,
          }}
        >
          {hitLabel}
        </div>
      )}

      {/* Song info bottom */}
      <div className="mt-auto mb-20 text-center">
        <div className="text-xs" style={{ color: "#555577" }}>
          {song.emoji} {song.title} · {song.bpm} BPM
        </div>
      </div>
    </div>
  );
}

/* ─── App ────────────────────────────────────────────────── */

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lastHit, setLastHit] = useState<HitQuality | null>(null);
  const [round, setRound] = useState(0);
  const [selectedSong, setSelectedSong] = useState<Song>(SONGS[0]!);
  const [resultStars, setResultStars] = useState(0);
  const [resultAccuracy, setResultAccuracy] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const lastHitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const songStartRef = useRef<number>(0);

  // Per-song high scores
  const [highScores, setHighScores] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem("beatstar-highscores");
      return raw ? (JSON.parse(raw) as Record<string, number>) : {};
    } catch {
      return {};
    }
  });

  const [globalHigh, setGlobalHigh] = useHighScore("beatstar-global-highscore");

  const saveHighScore = useCallback(
    (songId: string, s: number) => {
      setHighScores((prev) => {
        const prev2 = prev[songId] ?? 0;
        if (s <= prev2) return prev;
        const next = { ...prev, [songId]: s };
        try {
          localStorage.setItem("beatstar-highscores", JSON.stringify(next));
        } catch { /* ignore */ }
        return next;
      });
      setGlobalHigh(s);
    },
    [setGlobalHigh]
  );

  const handleSelectSong = useCallback((song: Song) => {
    setSelectedSong(song);
    setScore(0);
    setCombo(0);
    setLastHit(null);
    setTimeLeft(song.duration);
    setRound((r) => r + 1);
    songStartRef.current = Date.now();
    setPhase("playing");
  }, []);

  const handleScore = useCallback((s: number) => setScore(s), []);

  const handleCombo = useCallback((c: number) => setCombo(c), []);

  const handleHit = useCallback((quality: HitQuality) => {
    setLastHit(quality);
    if (lastHitTimer.current) clearTimeout(lastHitTimer.current);
    lastHitTimer.current = setTimeout(() => setLastHit(null), 600);

    // Update time left
    const elapsed = (Date.now() - songStartRef.current) / 1000;
    setTimeLeft(Math.max(0, selectedSong.duration - elapsed));
  }, [selectedSong.duration]);

  const handleGameOver = useCallback(
    (stars: number, accuracy: number) => {
      setResultStars(stars);
      setResultAccuracy(accuracy);
      saveHighScore(selectedSong.id, score);
      setPhase("over");
    },
    [score, selectedSong.id, saveHighScore]
  );

  const handleReplay = useCallback(() => {
    setScore(0);
    setCombo(0);
    setLastHit(null);
    setTimeLeft(selectedSong.duration);
    setRound((r) => r + 1);
    songStartRef.current = Date.now();
    setPhase("playing");
  }, [selectedSong.duration]);

  const handleMenu = useCallback(() => {
    setPhase("menu");
  }, []);

  return (
    <GameShell
      topbar={
        <GameTopbar
          title="Beat Star"
          stats={
            phase === "playing"
              ? [
                  { label: "Score", value: score.toLocaleString(), accent: true },
                  ...(combo >= 4 ? [{ label: "Combo", value: `${combo}x` }] : []),
                  { label: "Best", value: globalHigh.toLocaleString() },
                ]
              : [{ label: "Best", value: globalHigh.toLocaleString() }]
          }
        />
      }
    >
      {phase === "menu" && (
        <SongSelect
          songs={SONGS}
          highScores={highScores}
          onSelect={handleSelectSong}
        />
      )}

      {phase === "playing" && (
        <div className="w-full h-full relative">
          <Game
            key={round}
            bpm={selectedSong.bpm}
            level={selectedSong.level}
            songDuration={selectedSong.duration}
            onScore={handleScore}
            onCombo={handleCombo}
            onHit={handleHit}
            onGameOver={handleGameOver}
          />
          <HUD
            score={score}
            combo={combo}
            lastHit={lastHit}
            timeLeft={timeLeft}
            song={selectedSong}
          />
        </div>
      )}

      {phase === "over" && (
        <ResultScreen
          score={score}
          highScore={highScores[selectedSong.id] ?? 0}
          stars={resultStars}
          accuracy={resultAccuracy}
          song={selectedSong}
          onReplay={handleReplay}
          onMenu={handleMenu}
        />
      )}
    </GameShell>
  );
}
