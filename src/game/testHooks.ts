import type { GameSession } from "./session";

declare global {
  interface Window {
    __pb?: PbTestApi;
  }
}

export interface PbTestApi {
  state: () => unknown;
  advance: (ms: number) => void;
  manualClock: () => void;
  setPlayer: (p: { x: number; y: number; heading: number }) => void;
  spawn: (kind: "chaser" | "shooter", x: number, y: number) => void;
}

export function installTestHooks(s: GameSession) {
  if (
    import.meta.env.VITE_E2E !== "1" &&
    !new URLSearchParams(location.search).has("e2e")
  )
    return;
  window.__pb = {
    state: () => JSON.parse(JSON.stringify(s.sim.state)),
    advance: (ms) => s.advanceMs(ms),
    manualClock: () => s.enableManualClock(),
    setPlayer: (p) => {
      Object.assign(s.sim.state.player.pos, { x: p.x, y: p.y });
      s.sim.state.player.heading = p.heading;
    },
    spawn: (k, x, y) => {
      s.sim.spawnEnemyAt(k, { x, y });
    },
  };
}
