import type { SimEvent } from "./core/types";

const FILES = {
  front: "cannon_fire_1",
  broadside: "cannon_broadside",
  enemyFront: "cannon_fire_2",
  boom: "ship_explosion_1",
  hit: "ship_wood_hit_1",
  score: "score_point",
  start: "game_start",
  over: "game_over",
  complete: "game_complete",
  pause: "game_pause",
  resume: "game_resume",
  click: "ui_click",
} as const;
export type SfxKey = keyof typeof FILES;

const muted = new URLSearchParams(location.search).has("e2e"); // keeps E2E and visual tests quiet
const cache = new Map<SfxKey, HTMLAudioElement>();

export function playSfx(key: SfxKey) {
  if (muted) return;
  let a = cache.get(key);
  if (!a) {
    a = new Audio(`/assets/sounds/${FILES[key]}.wav`);
    cache.set(key, a);
  }
  a.currentTime = 0;
  void a.play().catch(() => {
    /* autoplay blocked or aborted: ignore */
  });
}

/** Maps simulation events to sounds. Keep it dumb: no rules here. */
export function sfxForEvent(e: SimEvent): SfxKey | null {
  switch (e.type) {
    case "shot":
      return e.broadside
        ? "broadside"
        : e.owner === "player"
          ? "front"
          : "enemyFront";
    case "hit":
      return "hit";
    case "explosion":
      return "boom";
    case "score":
      return "score";
  }
}
