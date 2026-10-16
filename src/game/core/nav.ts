import type { GameConfig } from "./config";
import { clamp, segmentHitsIsland } from "./math";
import type { Vec } from "./types";

const CELL = 20;
const SQRT2 = Math.SQRT2;
const NEIGHBORS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/** Grid pathfinding around square islands. Deterministic (no randomness, stable tie-breaks). */
export class NavGrid {
  private readonly cols: number;
  private readonly rows: number;
  private readonly blocked: Uint8Array;

  constructor(
    private readonly arena: GameConfig["arena"],
    /** Radius of the largest ship that will use the grid. */
    private readonly radius: number,
  ) {
    // Grid keeps extra room; straight-line checks are looser so ships hugging an island still see past it.
    const margin = radius + 4;
    this.cols = Math.ceil(arena.width / CELL);
    this.rows = Math.ceil(arena.height / CELL);
    this.blocked = new Uint8Array(this.cols * this.rows);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = (c + 0.5) * CELL,
          y = (r + 0.5) * CELL;
        const inside = arena.islands.some(
          (i) =>
            Math.abs(x - i.x) < i.half + margin &&
            Math.abs(y - i.y) < i.half + margin,
        );
        this.blocked[r * this.cols + c] = inside ? 1 : 0;
      }
    }
  }

  /** True if a ship of the configured clearance can travel straight from a to b. */
  clear(a: Vec, b: Vec): boolean {
    return !this.arena.islands.some((i) =>
      segmentHitsIsland(a, b, i, this.radius - 2),
    );
  }

  /** Next point to steer toward when the straight line is blocked; null if no route. */
  waypoint(from: Vec, to: Vec): Vec | null {
    const goal = this.nearestFree(this.cellOf(to));
    if (goal < 0) return null;
    const path = this.search(this.cellOf(from), goal);
    if (!path || path.length === 0) return null;
    for (let i = path.length - 1; i >= 0; i--) {
      const p = this.center(path[i]!);
      if (this.clear(from, p)) return p;
    }
    return this.center(path[0]!);
  }

  private cellOf(p: Vec): number {
    const c = clamp(Math.floor(p.x / CELL), 0, this.cols - 1);
    const r = clamp(Math.floor(p.y / CELL), 0, this.rows - 1);
    return r * this.cols + c;
  }

  private center(i: number): Vec {
    return {
      x: ((i % this.cols) + 0.5) * CELL,
      y: (Math.floor(i / this.cols) + 0.5) * CELL,
    };
  }

  /** The target may sit inside the clearance band; use the closest walkable cell. */
  private nearestFree(cell: number): number {
    if (!this.blocked[cell]) return cell;
    const c0 = cell % this.cols,
      r0 = Math.floor(cell / this.cols);
    let best = -1,
      bestD = Infinity;
    for (
      let r = Math.max(0, r0 - 6);
      r <= Math.min(this.rows - 1, r0 + 6);
      r++
    ) {
      for (
        let c = Math.max(0, c0 - 6);
        c <= Math.min(this.cols - 1, c0 + 6);
        c++
      ) {
        const i = r * this.cols + c;
        const d = (c - c0) ** 2 + (r - r0) ** 2;
        if (!this.blocked[i] && d < bestD) {
          best = i;
          bestD = d;
        }
      }
    }
    return best;
  }

  /** A* over 8-connected cells; the start cell may be blocked (ship hugging an island). */
  private search(start: number, goal: number): number[] | null {
    const n = this.cols * this.rows;
    const g = new Float64Array(n).fill(Infinity);
    const prev = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const gc = goal % this.cols,
      gr = Math.floor(goal / this.cols);
    const h = (i: number) => {
      const dx = Math.abs((i % this.cols) - gc),
        dy = Math.abs(Math.floor(i / this.cols) - gr);
      return Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy);
    };

    const open: number[] = [start];
    g[start] = 0;
    while (open.length) {
      let bi = 0;
      for (let k = 1; k < open.length; k++) {
        const a = open[k]!,
          b = open[bi]!;
        const fa = g[a]! + h(a),
          fb = g[b]! + h(b);
        if (fa < fb || (fa === fb && a < b)) bi = k;
      }
      const cur = open[bi]!;
      open[bi] = open[open.length - 1]!;
      open.pop();
      if (cur === goal) {
        const path: number[] = [];
        for (let i = cur; i !== start; i = prev[i]!) path.push(i);
        return path.reverse();
      }
      closed[cur] = 1;

      const cc = cur % this.cols,
        cr = Math.floor(cur / this.cols);
      for (const [dc, dr] of NEIGHBORS) {
        const nc = cc + dc,
          nr = cr + dr;
        if (nc < 0 || nr < 0 || nc >= this.cols || nr >= this.rows) continue;
        const ni = nr * this.cols + nc;
        if (closed[ni] || this.blocked[ni]) continue;
        // no squeezing diagonally between two blocked corners
        if (dc !== 0 && dr !== 0) {
          if (
            this.blocked[cr * this.cols + nc] ||
            this.blocked[nr * this.cols + cc]
          )
            continue;
        }
        const ng = g[cur]! + (dc !== 0 && dr !== 0 ? SQRT2 : 1);
        if (ng < g[ni]!) {
          if (g[ni] === Infinity) open.push(ni);
          g[ni] = ng;
          prev[ni] = cur;
        }
      }
    }
    return null;
  }
}
