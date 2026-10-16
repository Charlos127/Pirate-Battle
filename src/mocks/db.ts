import type { MatchRecord } from "../api/contracts";
import { fixtureRecords } from "./fixtures";

const KEY = "pb.mockdb";

export function readDb(): MatchRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* fall through */
  }
  const initial = fixtureRecords();
  localStorage.setItem(KEY, JSON.stringify(initial));
  return initial;
}
export const writeDb = (r: MatchRecord[]) =>
  localStorage.setItem(KEY, JSON.stringify(r));
export const resetDb = () => {
  localStorage.removeItem(KEY);
  localStorage.removeItem("pb.scenarioState");
};
