import { useEffect, useRef } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { GameSession } from "../game/session";
import { TouchControls } from "./TouchControls";

const HUD = "/assets/png/default/ui/hud";
const CTRL = "/assets/png/default/ui/controls";

export function GameOverlay({
  session,
  onExit,
}: {
  session: GameSession;
  onExit: () => void;
}) {
  const hud = useStore(
    session.store,
    useShallow((s) => ({
      status: s.status,
      score: s.score,
      hp: s.hp,
      maxHp: s.maxHp,
      secondsLeft: s.secondsLeft,
    })),
  );
  const paused = hud.status === "paused";
  const resumeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (paused) resumeRef.current?.focus();
  }, [paused]); // focus control in dialog

  return (
    <>
      <div className="hud" aria-hidden="true">
        <span className="hud-item" data-testid="hud-score">
          <img src={`${HUD}/icon_score.png`} alt="" width={24} height={24} />{" "}
          Score: {hud.score}
        </span>
        <span className="hud-item" data-testid="hud-time">
          <img src={`${HUD}/icon_time.png`} alt="" width={24} height={24} />{" "}
          Time: {hud.secondsLeft}s
        </span>
        <span className="hud-item" data-testid="hud-hp">
          <img src={`${HUD}/icon_heart.png`} alt="" width={24} height={24} />{" "}
          HP: {hud.hp}/{hud.maxHp}
        </span>
        <button
          type="button"
          className="icon-btn"
          aria-label="Pause"
          onClick={() => session.pause()}
        >
          <img src={`${CTRL}/icon_pause.png`} alt="" width={28} height={28} />
        </button>
      </div>

      {/* Semantic mirror — updates only on coarse changes, never per frame */}
      <div className="sr-only" role="status" aria-live="polite">
        {hud.status === "ended"
          ? `Match over. Score ${hud.score}.`
          : paused
            ? "Game paused."
            : `Score ${hud.score}. ${hud.secondsLeft} seconds left.`}
      </div>

      {paused && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-title"
          className="dialog panel"
        >
          <h2 id="pause-title">Paused</h2>
          <button
            ref={resumeRef}
            type="button"
            className="primary"
            onClick={() => session.resume()}
          >
            <img src={`${CTRL}/icon_play.png`} alt="" width={20} height={20} />{" "}
            Resume
          </button>
          <button type="button" onClick={onExit}>
            <img src={`${CTRL}/icon_home.png`} alt="" width={20} height={20} />{" "}
            Main Menu
          </button>
        </div>
      )}
      <TouchControls session={session} />
    </>
  );
}
