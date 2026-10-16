import { createStore, type StoreApi } from "zustand/vanilla";
import type { EndReason, MatchStatus } from "./core/types";

export interface HudValues {
  status: MatchStatus;
  score: number;
  hp: number;
  maxHp: number;
  secondsLeft: number; // integer => changes at most once per second
  endReason: EndReason | null;
}
export interface HudState extends HudValues {
  sync: (next: HudValues) => void;
  reset: () => void;
}
export type HudStore = StoreApi<HudState>;

const INITIAL: HudValues = {
  status: "running",
  score: 0,
  hp: 0,
  maxHp: 0,
  secondsLeft: 0,
  endReason: null,
};

export const createHudStore = (): HudStore =>
  createStore<HudState>()((set, get) => ({
    ...INITIAL,
    /** Called every frame, but only notifies subscribers if a displayed value changed. */
    sync: (next) => {
      const s = get();
      if (
        s.status === next.status &&
        s.score === next.score &&
        s.hp === next.hp &&
        s.maxHp === next.maxHp &&
        s.secondsLeft === next.secondsLeft &&
        s.endReason === next.endReason
      )
        return;
      set(next);
    },
    reset: () => set(INITIAL),
  }));
