import { useState, useCallback } from "react";
import { GameShell, GameTopbar, GameOverScreen } from "@freegamestore/games";
import { Game } from "./components/Game";
import { useHighScore } from "./hooks/useHighScore";
import type { GamePhase } from "./types";

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [combo, setCombo] = useState(0);
  const [round, setRound] = useState(0);
  const [highScore, setHighScore] = useHighScore("slicing-game-highscore");

  const start = useCallback(() => {
    setScore(0);
    setDistance(0);
    setCombo(0);
    setRound((r) => r + 1);
    setPhase("playing");
  }, []);

  const handleScore = useCallback((s: number) => {
    setScore(s);
  }, []);

  const handleDistance = useCallback((d: number) => {
    setDistance(d);
  }, []);

  const handleCombo = useCallback((c: number) => {
    setCombo(c);
  }, []);

  const handleGameOver = useCallback(() => {
    setPhase("over");
    setHighScore(score);
  }, [score, setHighScore]);

  return (
    <GameShell
      topbar={
        <GameTopbar
          title="Slicing"
          stats={[
            { label: "Score", value: score, accent: true },
            { label: "Distance", value: `${distance}m` },
            ...(combo > 1
              ? [{ label: "Combo", value: `x${combo}` }]
              : []),
            { label: "Best", value: highScore },
          ]}
        />
      }
    >
      {phase === "menu" && (
        <div className="flex flex-col items-center justify-center h-full gap-6 px-4">
          <h1
            className="text-5xl md:text-7xl font-bold text-center"
            style={{ fontFamily: "Fraunces, serif", color: "var(--ink)" }}
          >
            🔪 Slicing
          </h1>
          <p
            className="text-lg md:text-xl text-center max-w-md"
            style={{ color: "var(--muted)" }}
          >
            Jump and slice through fruits as your knife flies forward!
            Avoid the bombs!
          </p>

          <div
            className="text-sm text-center max-w-sm space-y-1"
            style={{ color: "var(--muted)" }}
          >
            <p>
              <strong>Desktop:</strong> Space/↑ to jump · ←/→ to switch lanes
            </p>
            <p>
              <strong>Mobile:</strong> Tap to jump · Swipe left/right to switch lanes
            </p>
          </div>

          <button
            onClick={start}
            className="px-8 py-4 rounded-xl text-xl font-bold text-white transition-transform active:scale-95"
            style={{
              background: "var(--accent)",
              minWidth: "200px",
              minHeight: "56px",
            }}
          >
            Start Slicing!
          </button>

          {highScore > 0 && (
            <p style={{ color: "var(--muted)" }}>
              Best Score: <strong style={{ color: "var(--ink)" }}>{highScore}</strong>
            </p>
          )}
        </div>
      )}

      {phase === "playing" && (
        <div className="w-full h-full relative">
          <Game
            key={round}
            onScore={handleScore}
            onDistance={handleDistance}
            onGameOver={handleGameOver}
            onCombo={handleCombo}
          />

          {/* Mobile jump button */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none md:hidden">
            <div
              className="text-xs text-center px-4 py-2 rounded-full"
              style={{
                background: "var(--glass)",
                color: "var(--muted)",
                backdropFilter: "blur(8px)",
              }}
            >
              Tap to jump · Swipe to change lanes
            </div>
          </div>

          {/* Combo display */}
          {combo > 1 && (
            <div
              className="absolute top-2 left-1/2 -translate-x-1/2 text-2xl font-bold animate-pulse"
              style={{
                color: combo >= 5 ? "#ffd700" : combo >= 3 ? "#ff8c00" : "var(--accent)",
                fontFamily: "Fraunces, serif",
                textShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              {combo}x COMBO!
            </div>
          )}
        </div>
      )}

      {phase === "over" && (
        <GameOverScreen
          score={score}
          highScore={highScore}
          onRestart={start}
          stats={[
            { label: "Distance", value: `${distance}m` },
            { label: "Score", value: score },
          ]}
        />
      )}
    </GameShell>
  );
}
