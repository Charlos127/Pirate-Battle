import type { GameConfig, ProjectileConfig } from "./config";
import { Rng } from "./rng";
import {
  angleDiff,
  clamp,
  dist,
  distPointSegment,
  forward,
  headingTo,
  resolveIslands,
  segmentHitsIsland,
} from "./math";
import { NavGrid } from "./nav";
import type {
  Enemy,
  EnemyKind,
  GameState,
  InputState,
  Player,
  Projectile,
  SimEvent,
  Vec,
} from "./types";

const MAX_DT = 0.05; // guards against huge frame spikes (tab switch, breakpoints)

export class Simulation {
  readonly config: GameConfig;
  state: GameState;
  events: SimEvent[] = [];

  private rng: Rng;
  private nextId = 1;
  private spawnTimer = 0;
  private resumed = false;
  private nav: NavGrid;
  private routes = new Map<number, { replanIn: number; wp: Vec | null }>();

  constructor(config: GameConfig, seed: number) {
    this.config = structuredClone(config); // snapshot
    this.rng = new Rng(seed);
    const { arena, player } = this.config;
    this.nav = new NavGrid(
      arena,
      Math.max(this.config.chaser.radius, this.config.shooter.radius),
    );
    const p: Player = {
      id: this.nextId++,
      pos: { x: arena.width / 2, y: arena.height - 80 },
      heading: 0,
      hp: player.maxHp,
      maxHp: player.maxHp,
      radius: player.radius,
      dead: false,
      cooldowns: { front: 0, left: 0, right: 0 },
    };
    this.state = {
      status: "running",
      endReason: null,
      time: 0,
      score: 0,
      player: p,
      enemies: [],
      projectiles: [],
    };
  }

  // ---------- public API ----------
  pause() {
    if (this.state.status === "running") this.state.status = "paused";
  }
  resume() {
    if (this.state.status === "paused") {
      this.state.status = "running";
      this.resumed = true;
    }
  }
  /** The input layer calls this to know it must drop held keys after a pause. */
  consumeResumeFlag() {
    const r = this.resumed;
    this.resumed = false;
    return r;
  }
  drainEvents(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  step(rawDt: number, input: InputState) {
    if (this.state.status !== "running") return;
    const dt = Math.min(rawDt, MAX_DT);
    this.state.time += dt;

    this.updatePlayer(dt, input);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateSpawns(dt);
    this.cleanup();
    this.checkEnd();
  }

  /** Test/seed helper and also used by the spawn system. */
  spawnEnemyAt(kind: EnemyKind, pos: Vec): Enemy {
    const c = this.config[kind];
    const e: Enemy = {
      id: this.nextId++,
      kind,
      pos: { ...pos },
      heading: headingTo(pos, this.state.player.pos),
      hp: c.hp,
      maxHp: c.hp,
      radius: c.radius,
      dead: false,
      cooldown: kind === "shooter" ? this.config.shooter.cooldown : 0,
    };
    this.state.enemies.push(e);
    return e;
  }

  // ---------- player ----------
  private updatePlayer(dt: number, input: InputState) {
    const p = this.state.player;
    const { player, weapons, arena } = this.config;

    const turn = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    p.heading += turn * player.turnSpeed * dt;
    if (input.forward) {
      const f = forward(p.heading);
      p.pos.x += f.x * player.speed * dt;
      p.pos.y += f.y * player.speed * dt;
    }
    p.pos.x = clamp(p.pos.x, p.radius, arena.width - p.radius);
    p.pos.y = clamp(p.pos.y, p.radius, arena.height - p.radius);
    resolveIslands(p.pos, p.radius, arena.islands);

    const cd = p.cooldowns;
    cd.front = Math.max(0, cd.front - dt);
    cd.left = Math.max(0, cd.left - dt);
    cd.right = Math.max(0, cd.right - dt);

    if (input.fireFront && cd.front <= 0) {
      cd.front = weapons.front.cooldown;
      this.fire("player", p, p.heading, weapons.front);
    }
    if (input.fireLeft && cd.left <= 0) {
      cd.left = weapons.side.cooldown;
      this.fireBroadside(p, -Math.PI / 2);
    }
    if (input.fireRight && cd.right <= 0) {
      cd.right = weapons.side.cooldown;
      this.fireBroadside(p, Math.PI / 2);
    }
  }

  /** Three parallel projectiles, offset along the ship's length. */
  private fireBroadside(p: Player, angleOffset: number) {
    const w = this.config.weapons.side;
    const dir = p.heading + angleOffset;
    const f = forward(p.heading);
    for (const k of [-1, 0, 1]) {
      this.fire(
        "player",
        p,
        dir,
        w,

        { x: f.x * k * w.spacing, y: f.y * k * w.spacing },
        true,
      );
    }
  }

  private fire(
    owner: "player" | "enemy",
    from: { pos: Vec; radius: number },
    heading: number,
    cfg: ProjectileConfig,

    offset: Vec = { x: 0, y: 0 },
    broadside = false,
  ) {
    const d = forward(heading);
    const muzzle = from.radius + 2;
    const pos = {
      x: from.pos.x + d.x * muzzle + offset.x,
      y: from.pos.y + d.y * muzzle + offset.y,
    };
    const proj: Projectile = {
      id: this.nextId++,
      owner,
      pos,
      vel: { x: d.x * cfg.speed, y: d.y * cfg.speed },
      damage: cfg.damage,
      radius: cfg.radius,
      ttl: cfg.ttl,
      dead: false,
    };
    this.state.projectiles.push(proj);
    this.events.push({ type: "shot", pos: { ...pos }, owner, broadside });
  }

  // ---------- enemies ----------
  private updateEnemies(dt: number) {
    const player = this.state.player;
    const { arena } = this.config;

    for (const e of this.state.enemies) {
      if (e.dead) continue;
      const c = this.config[e.kind];

      // turn toward the player (or the next waypoint around an island) at a limited rate
      const toPlayer = headingTo(e.pos, player.pos);
      const los = this.nav.clear(e.pos, player.pos);
      const steer = los ? player.pos : (this.routeTarget(e, dt) ?? player.pos);
      if (los) this.routes.delete(e.id);
      const want = headingTo(e.pos, steer);
      const diff = angleDiff(e.heading, want);
      const maxTurn = c.turnSpeed * dt;
      e.heading += clamp(diff, -maxTurn, maxTurn);

      const d = dist(e.pos, player.pos);
      let advance = true;
      if (e.kind === "shooter") {
        // approach until comfortably inside the attack range and with a clear shot
        advance = !los || d > this.config.shooter.attackRange * 0.85;
        e.cooldown = Math.max(0, e.cooldown - dt);
        const aimed = Math.abs(angleDiff(e.heading, toPlayer)) < 0.25;
        if (
          los &&
          d <= this.config.shooter.attackRange &&
          aimed &&
          e.cooldown <= 0
        ) {
          e.cooldown = this.config.shooter.cooldown;
          this.fire("enemy", e, e.heading, this.config.shooter.projectile);
        }
      }
      if (advance) {
        const f = forward(e.heading);
        e.pos.x += f.x * c.speed * dt;
        e.pos.y += f.y * c.speed * dt;
      }
      e.pos.x = clamp(e.pos.x, e.radius, arena.width - e.radius);
      e.pos.y = clamp(e.pos.y, e.radius, arena.height - e.radius);
      resolveIslands(e.pos, e.radius, arena.islands);

      // Chaser: collide => damage player and explode (no score)
      if (e.kind === "chaser" && d <= e.radius + player.radius) {
        player.hp = Math.max(0, player.hp - this.config.chaser.impactDamage);
        e.dead = true;
        this.events.push({
          type: "hit",
          pos: { ...player.pos },
          target: "player",
        });
        this.events.push({ type: "explosion", pos: { ...e.pos }, big: false });
      }
    }
  }

  /** Waypoint around islands toward the player, re-planned periodically. */
  private routeTarget(e: Enemy, dt: number): Vec | null {
    let r = this.routes.get(e.id);
    if (!r) {
      r = { replanIn: 0, wp: null };
      this.routes.set(e.id, r);
    }
    r.replanIn -= dt;
    if (r.replanIn <= 0 || (r.wp && dist(e.pos, r.wp) < 12)) {
      r.wp = this.nav.waypoint(e.pos, this.state.player.pos);
      r.replanIn = 0.3;
    }
    return r.wp;
  }

  // ---------- projectiles ----------
  private updateProjectiles(dt: number) {
    const { arena } = this.config;
    const { player, enemies } = this.state;

    for (const pr of this.state.projectiles) {
      if (pr.dead) continue;
      const prev = { ...pr.pos };
      pr.pos.x += pr.vel.x * dt;
      pr.pos.y += pr.vel.y * dt;
      pr.ttl -= dt;

      const outside =
        pr.pos.x < 0 ||
        pr.pos.y < 0 ||
        pr.pos.x > arena.width ||
        pr.pos.y > arena.height;
      if (pr.ttl <= 0 || outside) {
        pr.dead = true;
        continue;
      }

      // island blocks projectiles (swept check avoids tunnelling)
      if (arena.islands.some((i) => segmentHitsIsland(prev, pr.pos, i))) {
        pr.dead = true;
        continue;
      }

      if (pr.owner === "player") {
        for (const e of enemies) {
          if (e.dead) continue;
          if (distPointSegment(e.pos, prev, pr.pos) <= e.radius + pr.radius) {
            e.hp -= pr.damage;
            pr.dead = true; // damage applies ONCE
            this.events.push({
              type: "hit",
              pos: { ...pr.pos },
              target: "enemy",
            });
            if (e.hp <= 0) {
              e.dead = true;
              this.state.score += 1;
              this.events.push({
                type: "explosion",
                pos: { ...e.pos },
                big: true,
              });
              this.events.push({ type: "score", pos: { ...e.pos } });
            }
            break;
          }
        }
      } else if (
        !player.dead &&
        distPointSegment(player.pos, prev, pr.pos) <= player.radius + pr.radius
      ) {
        player.hp = Math.max(0, player.hp - pr.damage);
        pr.dead = true;
        this.events.push({ type: "hit", pos: { ...pr.pos }, target: "player" });
      }
    }
  }

  // ---------- spawn ----------
  private updateSpawns(dt: number) {
    const sp = this.config.spawn;
    this.spawnTimer += dt;
    while (this.spawnTimer >= sp.intervalSec) {
      this.spawnTimer -= sp.intervalSec;
      if (this.state.enemies.filter((e) => !e.dead).length >= sp.maxAlive)
        continue;
      const pos = this.findSpawnPoint();
      if (pos) this.spawnEnemyAt(this.pickKind(), pos);
    }
  }

  private pickKind(): EnemyKind {
    const w = this.config.spawn.weights;
    return this.rng.next() * (w.chaser + w.shooter) < w.chaser
      ? "chaser"
      : "shooter";
  }

  /** Free of islands, inside the arena, far enough from the player. */
  private findSpawnPoint(): Vec | null {
    const { arena, spawn } = this.config;
    for (let attempt = 0; attempt < 30; attempt++) {
      const pos = {
        x: this.rng.range(spawn.edgeMargin, arena.width - spawn.edgeMargin),
        y: this.rng.range(spawn.edgeMargin, arena.height - spawn.edgeMargin),
      };
      const nearIsland = arena.islands.some(
        (i) =>
          Math.abs(pos.x - i.x) < i.half + 40 &&
          Math.abs(pos.y - i.y) < i.half + 40,
      );
      if (nearIsland) continue;
      if (dist(pos, this.state.player.pos) < spawn.minDistanceFromPlayer)
        continue;
      return pos;
    }
    return null;
  }

  // ---------- lifecycle ----------
  private cleanup() {
    for (const e of this.state.enemies) if (e.dead) this.routes.delete(e.id);
    this.state.enemies = this.state.enemies.filter((e) => !e.dead);
    this.state.projectiles = this.state.projectiles.filter((p) => !p.dead);
  }

  private checkEnd() {
    const s = this.state;
    if (s.player.hp <= 0) {
      s.player.dead = true;
      s.status = "ended";
      s.endReason = "death";
      this.events.push({
        type: "explosion",
        pos: { ...s.player.pos },
        big: true,
      });
    } else if (s.time >= this.config.session.durationSec) {
      s.time = this.config.session.durationSec;
      s.status = "ended";
      s.endReason = "time";
    }
  }
}
