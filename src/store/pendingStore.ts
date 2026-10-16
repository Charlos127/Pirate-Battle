import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { matchRecordSchema, type MatchRecord } from "../api/contracts";

interface PendingState {
  items: MatchRecord[];
  add: (r: MatchRecord) => void;
  remove: (matchId: string) => void;
}

export const usePendingStore = create<PendingState>()(
  persist(
    (set) => ({
      items: [],
      add: (r) =>
        set((s) =>
          s.items.some((x) => x.matchId === r.matchId)
            ? s
            : { items: [...s.items, r] },
        ), // never duplicates
      remove: (id) =>
        set((s) => ({ items: s.items.filter((x) => x.matchId !== id) })),
    }),
    {
      name: "pb.pending",
      version: 1,
      merge: (persisted, current) => {
        const parsed = z
          .object({ items: z.array(matchRecordSchema) })
          .safeParse(persisted);
        return parsed.success
          ? { ...current, items: parsed.data.items }
          : current;
      },
    },
  ),
);

export const getPending = () => usePendingStore.getState().items;
export const addPending = (r: MatchRecord) => usePendingStore.getState().add(r);
export const removePending = (id: string) =>
  usePendingStore.getState().remove(id);
