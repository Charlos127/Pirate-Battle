import { describe, it, expect } from "vitest";
import { Simulation } from "./sim";
import { DEFAULT_CONFIG, type GameConfig } from "./config";
import { EMPTY_INPUT, type InputState } from "./types";

const STEP = 1 / 60;
const input = (p: Partial<InputState> = {}): InputState => ({
  ...EMPTY_INPUT,
  ...p,
});

function make(patch: (c: GameConfig) => void = () => {}, seed = 1) {
  const cfg = structuredClone(DEFAULT_CONFIG);
  cfg.arena.islands = [{ x: 640, y: 360, half: 80 }];
  cfg.spawn.intervalSec = 9999; // no spawns unless a test wants them
  patch(cfg);
  return new Simulation(cfg, seed);
}
const run = (sim: Simulation, seconds: number, i: InputState = input()) => {
  for (let t = 0; t < seconds; t += STEP) sim.step(STEP, i);
};

describe("player movement", () => {
  it("moves forward along its heading, independent of frame rate", () => {
    const a = make(),
      b = make();
    const y0 = a.state.player.pos.y;
    run(a, 1, input({ forward: true }));
    for (let i = 0; i < 30; i++) b.step(1 / 30, input({ forward: true }));
    expect(a.state.player.pos.y).toBeLessThan(y0);
    expect(a.state.player.pos.y).toBeCloseTo(b.state.player.pos.y, 0);
  });
  it("rotates both ways", () => {
    const s = make();
    run(s, 0.5, input({ right: true }));
    expect(s.state.player.heading).toBeGreaterThan(0);
    const t = make();
    run(t, 0.5, input({ left: true }));
    expect(t.state.player.heading).toBeLessThan(0);
  });
  it("stays inside the visible arena", () => {
    const s = make();
    s.state.player.pos = { x: 30, y: 30 };
    s.state.player.heading = -Math.PI / 4;
    run(s, 3, input({ forward: true }));
    const p = s.state.player;
    expect(p.pos.x).toBeGreaterThanOrEqual(p.radius);
    expect(p.pos.y).toBeGreaterThanOrEqual(p.radius);
  });
  it("cannot cross islands", () => {
    const s = make();
    s.state.player.pos = { x: 640, y: 600 };
    s.state.player.heading = 0;
    run(s, 4, input({ forward: true }));
    expect(s.state.player.pos.y).toBeGreaterThanOrEqual(
      360 + 80 + s.state.player.radius - 0.01,
    );
  });
  it("slides around a square island corner instead of getting stuck", () => {
    const s = make();
    s.state.player.pos = { x: 700, y: 460 };
    s.state.player.heading = Math.PI / 4; // up-right, pressing into the island's bottom side
    run(s, 1, input({ forward: true }));
    expect(s.state.player.pos.x).toBeGreaterThan(700);
  });
});

describe("player weapons", () => {
  it("front fire creates one projectile and respects cooldown", () => {
    const s = make();
    const cd = s.config.weapons.front.cooldown;
    const shots = () =>
      s.drainEvents().filter((e) => e.type === "shot" && e.owner === "player")
        .length;

    s.step(STEP, input({ fireFront: true }));
    expect(shots()).toBe(1);

    s.step(STEP, input({ fireFront: true })); // still cooling down
    expect(shots()).toBe(0);

    run(s, cd + 0.1, input({ fireFront: true }));
    expect(shots()).toBeGreaterThanOrEqual(1); // fired again after the cooldown
  });
  it("side fire creates three parallel projectiles (left and right)", () => {
    const s = make();
    s.step(STEP, input({ fireLeft: true }));
    const ps = s.state.projectiles;
    expect(ps).toHaveLength(3);
    const v = ps[0]!.vel;
    for (const p of ps) {
      expect(p.vel.x).toBeCloseTo(v.x);
      expect(p.vel.y).toBeCloseTo(v.y);
    }
    expect(v.x).toBeLessThan(0); // heading 0 => left side shoots to -x
    const r = make();
    r.step(STEP, input({ fireRight: true }));
    expect(r.state.projectiles[0]!.vel.x).toBeGreaterThan(0);
  });
  it("can move and fire simultaneously", () => {
    const s = make();
    const y0 = s.state.player.pos.y;
    run(s, 0.5, input({ forward: true, fireFront: true }));
    expect(s.state.player.pos.y).toBeLessThan(y0);
    expect(s.state.projectiles.length).toBeGreaterThan(0);
  });
  it("projectiles expire by ttl and are blocked by islands", () => {
    const s = make((c) => {
      c.weapons.front.ttl = 0.1;
    });
    s.step(STEP, input({ fireFront: true }));
    run(s, 0.3);
    expect(s.state.projectiles).toHaveLength(0);

    const t = make();
    t.state.player.pos = { x: 640, y: 520 };
    t.state.player.heading = 0;
    t.step(STEP, input({ fireFront: true }));
    run(t, 1);
    expect(t.state.projectiles).toHaveLength(0); // died on the island
  });
});

describe("combat", () => {
  it("projectile damages an enemy exactly once and is removed", () => {
    const s = make();
    s.spawnEnemyAt("shooter", { x: 100, y: 100 });
    const e = s.state.enemies[0]!;
    e.cooldown = 999;
    s.state.player.pos = { x: 100, y: 300 };
    s.state.player.heading = 0;
    const hp = e.hp;
    s.step(STEP, input({ fireFront: true }));
    run(s, 1);
    expect(e.hp).toBe(hp - DEFAULT_CONFIG.weapons.front.damage);
    expect(
      s.state.projectiles.filter((p) => p.owner === "player"),
    ).toHaveLength(0);
  });
  it("scores 1 point per enemy destroyed by the player", () => {
    const s = make((c) => {
      c.shooter.hp = 1;
    });
    s.spawnEnemyAt("shooter", { x: 100, y: 100 });
    s.state.enemies[0]!.cooldown = 999;
    s.state.player.pos = { x: 100, y: 300 };
    s.state.player.heading = 0;
    s.step(STEP, input({ fireFront: true }));
    run(s, 1);
    expect(s.state.score).toBe(1);
    expect(s.state.enemies).toHaveLength(0);
  });
  it("a chaser explodes on impact, damages the player and does NOT score", () => {
    const s = make();
    s.spawnEnemyAt("chaser", {
      x: s.state.player.pos.x + 20,
      y: s.state.player.pos.y,
    });
    const hp = s.state.player.hp;
    run(s, 0.2);
    expect(s.state.player.hp).toBe(hp - DEFAULT_CONFIG.chaser.impactDamage);
    expect(s.state.enemies).toHaveLength(0);
    expect(s.state.score).toBe(0);
  });
  it("a shooter fires only inside its attack range", () => {
    const far = make();
    far.spawnEnemyAt("shooter", { x: 20, y: 20 });
    far.state.player.pos = { x: 1200, y: 700 };
    far.step(STEP, input());
    expect(
      far.state.projectiles.filter((p) => p.owner === "enemy"),
    ).toHaveLength(0);

    const near = make();
    near.state.player.pos = { x: 200, y: 600 };
    near.spawnEnemyAt("shooter", { x: 200, y: 400 });
    run(near, 2);
    expect(
      near.state.projectiles.some((p) => p.owner === "enemy") ||
        near.state.player.hp < 10,
    ).toBe(true);
  });
  it("enemy projectiles damage the player once", () => {
    const s = make();
    s.state.player.pos = { x: 200, y: 600 };
    s.spawnEnemyAt("shooter", { x: 200, y: 450 });
    run(s, 3);
    expect(s.state.player.hp).toBeLessThan(10);
    expect(s.state.player.hp).toBeGreaterThan(0);
  });
  it("destroyed enemies stop shooting and colliding", () => {
    const s = make();
    s.spawnEnemyAt("shooter", { x: 200, y: 400 });
    s.state.enemies[0]!.hp = 0;
    s.state.enemies[0]!.dead = true;
    run(s, 0.1);
    expect(s.state.enemies).toHaveLength(0);
  });
});

describe("enemy navigation", () => {
  it("a chaser walks around an island to reach the player", () => {
    const s = make();
    s.state.player.pos = { x: 640, y: 520 };
    s.spawnEnemyAt("chaser", { x: 640, y: 150 }); // island sits on the straight line
    const hp = s.state.player.hp;
    run(s, 12);
    expect(s.state.player.hp).toBe(hp - DEFAULT_CONFIG.chaser.impactDamage);
  });
  it("a shooter never fires through an island", () => {
    const s = make();
    s.state.player.pos = { x: 640, y: 520 };
    s.spawnEnemyAt("shooter", { x: 640, y: 250 });
    s.step(STEP, input());
    run(s, 0.5);
    expect(s.state.projectiles.some((p) => p.owner === "enemy")).toBe(false);
  });
});

describe("spawning", () => {
  it("spawns on the configured interval", () => {
    const s = make((c) => {
      c.spawn.intervalSec = 2;
      c.player.maxHp = 9999;
    });
    run(s, 1.9);
    expect(s.state.enemies).toHaveLength(0);
    run(s, 0.2);
    expect(s.state.enemies).toHaveLength(1);
  });
  it("spawns away from islands and from the player", () => {
    const s = make((c) => {
      c.spawn.intervalSec = 0.5;
      c.player.maxHp = 99999;
    }, 7);
    const seen: { x: number; y: number }[] = [];
    for (let i = 0; i < 600; i++) {
      const before = s.state.enemies.length;
      s.step(STEP, input());
      if (s.state.enemies.length > before)
        seen.push({ ...s.state.enemies.at(-1)!.pos });
    }
    expect(seen.length).toBeGreaterThan(5);
    for (const p of seen) {
      expect(
        Math.max(Math.abs(p.x - 640), Math.abs(p.y - 360)),
      ).toBeGreaterThan(80);
    }
  });
  it("both enemy types appear in a default match", () => {
    const s = make((c) => {
      c.spawn.intervalSec = 2.5;
      c.player.maxHp = 99999;
    });
    const kinds = new Set<string>();
    for (let i = 0; i < 60 * 90; i++) {
      s.step(STEP, input());
      s.state.enemies.forEach((e) => kinds.add(e.kind));
    }
    expect(kinds).toEqual(new Set(["chaser", "shooter"]));
  });
});

describe("match rules", () => {
  it("ends by time and freezes everything", () => {
    const s = make((c) => {
      c.session.durationSec = 1;
    });
    run(s, 1.2);
    expect(s.state.status).toBe("ended");
    expect(s.state.endReason).toBe("time");
    const snapshot = JSON.stringify(s.state);
    run(s, 2, input({ forward: true, fireFront: true }));
    expect(JSON.stringify(s.state)).toBe(snapshot);
  });
  it("ends by death", () => {
    const s = make();
    s.state.player.hp = 1;
    s.spawnEnemyAt("chaser", {
      x: s.state.player.pos.x + 10,
      y: s.state.player.pos.y,
    });
    run(s, 0.3);
    expect(s.state.endReason).toBe("death");
    expect(s.state.status).toBe("ended");
  });
  it("pause freezes time, cooldowns and simulation; resume clears input", () => {
    const s = make();
    run(s, 0.5, input({ forward: true }));
    const t = s.state.time;
    const pos = { ...s.state.player.pos };
    s.pause();
    run(s, 5, input({ forward: true }));
    expect(s.state.time).toBe(t);
    expect(s.state.player.pos).toEqual(pos);
    s.resume();
    expect(s.consumeResumeFlag()).toBe(true); // input layer must drop held keys
  });
  it("a new Simulation is a clean restart", () => {
    const a = make();
    run(a, 2, input({ forward: true }));
    const b = make();
    expect(b.state.time).toBe(0);
    expect(b.state.score).toBe(0);
    expect(b.state.player.hp).toBe(b.state.player.maxHp);
  });
});
