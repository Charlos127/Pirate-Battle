import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import {
  DEFAULT_OPTIONS,
  configKey,
  optionsSchema,
  type Options,
} from "../game/core/config";
import { matchRecordSchema } from "../api/contracts";
import type { MatchResult } from "../game/session";

export type Screen = "menu" | "options" | "playing" | "result";

/** What the Result screen needs; also what is persisted as "last completed match". */
export const lastResultSchema = matchRecordSchema.omit({ playerName: true });
export type LastResult = z.infer<typeof lastResultSchema>;

const persistedSchema = z.object({
  options: optionsSchema,
  lastResult: lastResultSchema.nullable(),
});

export function getPlayerId(): string {
  let id = localStorage.getItem("pb.playerId");
  if (!id) {
    id = `player-${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem("pb.playerId", id);
  }
  return id;
}

interface AppState {
  screen: Screen;
  options: Options;
  lastResult: LastResult | null;
  matchNonce: number; // bumps on every new match => React key => clean remount
  go: (s: Screen) => void;
  setOptions: (o: Options) => void;
  startMatch: () => void;
  finishMatch: (r: MatchResult) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      screen: "menu",
      options: DEFAULT_OPTIONS,
      lastResult: null,
      matchNonce: 0,
      go: (screen) => set({ screen }),
      setOptions: (options) => set({ options, screen: "menu" }),
      startMatch: () =>
        set((s) => ({ screen: "playing", matchNonce: s.matchNonce + 1 })),
      finishMatch: (r) =>
        set((s) => ({
          screen: "result",
          lastResult: {
            ...r,
            matchId: crypto.randomUUID(), // generated ONCE: the idempotency key
            playerId: getPlayerId(),
            finishedAt: new Date().toISOString(),
            options: s.options, // snapshot used by THIS match
            configKey: configKey(s.options),
          },
        })),
    }),
    {
      name: "pb.app",
      version: 1,
      partialize: (s) => ({ options: s.options, lastResult: s.lastResult }),
      // Validated hydration: corrupt/outdated data falls back to defaults.
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        return parsed.success ? { ...current, ...parsed.data } : current;
      },
    },
  ),
);
