/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from "react";
import { GameSession, type MatchResult } from "../game/session";
import { loadGameAssets } from "../game/render/assets";
import { buildConfig, type Options } from "../game/core/config";
import { GameOverlay } from "./Hud";
import { installTestHooks } from "../game/testHooks";

export function GameScreen({
  options,
  onEnd,
  onExit,
}: {
  options: Options;
  onEnd: (r: MatchResult) => void;
  onExit: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let created: GameSession | null = null;
    setError(null);
    setProgress(0);
    (async () => {
      try {
        await loadGameAssets((p) => !cancelled && setProgress(p));
        if (cancelled || !hostRef.current) return;
        const config = buildConfig(options); // snapshot at match start
        created = new GameSession(config, Date.now() & 0xffff, onEnd);
        await created.start(hostRef.current);
        if (cancelled) {
          created.destroy();
          return;
        }
        installTestHooks(created);
        setSession(created);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Unknown error");
      }
    })();

    return () => {
      cancelled = true;
      created?.destroy();
      setSession(null);
    };
  }, [attempt, onEnd, options]);

  return (
    <div className="game-root">
      <div ref={hostRef} className="game-canvas" data-testid="arena" />
      {!session && !error && (
        <div
          role="progressbar"
          aria-label="Loading assets"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          Loading assets… {Math.round(progress * 100)}%
        </div>
      )}
      {error && (
        <div role="alert">
          <p>Could not load game assets. {error}</p>
          <button onClick={() => setAttempt((a) => a + 1)}>Retry</button>
          <button onClick={onExit}>Main Menu</button>
        </div>
      )}
      {session && <GameOverlay session={session} onExit={onExit} />}
    </div>
  );
}
