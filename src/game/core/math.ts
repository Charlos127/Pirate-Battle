import type { Island } from "./config";
import type { Vec } from "./types";

export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const forward = (h: number): Vec => ({
  x: Math.sin(h),
  y: -Math.cos(h),
});
export const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

export function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Smallest signed angle to rotate `from` toward `to`. */
export const angleDiff = (from: number, to: number) =>
  normalizeAngle(to - from);

export const headingTo = (from: Vec, to: Vec) =>
  Math.atan2(to.x - from.x, -(to.y - from.y));

/** Distance from point p to the segment a-b (used for swept projectile checks). */
export function distPointSegment(p: Vec, a: Vec, b: Vec): number {
  const abx = b.x - a.x,
    aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  const t =
    len2 === 0
      ? 0
      : clamp(((p.x - a.x) * abx + (p.y - a.y) * aby) / len2, 0, 1);
  return Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t));
}

/** Push a circle out of every square island; returns true if it collided. */
export function resolveIslands(
  pos: Vec,
  radius: number,
  islands: Island[],
): boolean {
  let hit = false;
  for (const isl of islands) {
    const left = isl.x - isl.half,
      right = isl.x + isl.half,
      top = isl.y - isl.half,
      bottom = isl.y + isl.half;
    const cx = clamp(pos.x, left, right),
      cy = clamp(pos.y, top, bottom);
    const dx = pos.x - cx,
      dy = pos.y - cy;
    const d = Math.hypot(dx, dy);
    if (d >= radius) continue;
    hit = true;
    if (d > 0) {
      pos.x = cx + (dx / d) * radius;
      pos.y = cy + (dy / d) * radius;
    } else {
      // centre is inside the square: leave through the nearest face
      const m = Math.min(
        pos.x - left,
        right - pos.x,
        pos.y - top,
        bottom - pos.y,
      );
      if (m === pos.x - left) pos.x = left - radius;
      else if (m === right - pos.x) pos.x = right + radius;
      else if (m === pos.y - top) pos.y = top - radius;
      else pos.y = bottom + radius;
    }
  }
  return hit;
}

/** True if segment a-b touches the island square grown by `margin` (slab method). */
export function segmentHitsIsland(
  a: Vec,
  b: Vec,
  isl: Island,
  margin = 0,
): boolean {
  const h = isl.half + margin;
  let t0 = 0,
    t1 = 1;
  const axes: Array<[number, number, number]> = [
    [a.x, b.x - a.x, isl.x],
    [a.y, b.y - a.y, isl.y],
  ];
  for (const [p, d, c] of axes) {
    if (d === 0) {
      if (p < c - h || p > c + h) return false;
      continue;
    }
    const ta = (c - h - p) / d,
      tb = (c + h - p) / d;
    t0 = Math.max(t0, Math.min(ta, tb));
    t1 = Math.min(t1, Math.max(ta, tb));
    if (t0 > t1) return false;
  }
  return true;
}
