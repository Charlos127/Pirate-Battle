import type { GameSession } from "../game/session";
import type { InputState } from "../game/core/types";

const BASE = "/assets/png/default/ui/controls";

const BTN: Array<[keyof InputState, string, string]> = [
  ["left", "icon_turn_left.png", "Rotate left"],
  ["right", "icon_turn_right.png", "Rotate right"],
  ["forward", "icon_forward.png", "Move forward"],
  ["fireLeft", "icon_fire_left.png", "Fire left broadside"],
  ["fireFront", "icon_fire_front.png", "Fire front"],
  ["fireRight", "icon_fire_right.png", "Fire right broadside"],
];

export function TouchControls({ session }: { session: GameSession }) {
  return (
    <div className="touch" role="group" aria-label="Touch controls">
      {BTN.map(([action, icon, label]) => (
        <button
          key={action}
          type="button"
          className="touch-btn"
          aria-label={label}
          data-testid={`touch-${action}`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            session.input.setAction(action, true);
          }}
          onPointerUp={() => session.input.setAction(action, false)}
          onPointerCancel={() => session.input.setAction(action, false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <img src={`${BASE}/${icon}`} alt="" draggable={false} />
        </button>
      ))}
    </div>
  );
}
