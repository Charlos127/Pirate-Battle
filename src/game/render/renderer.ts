import {
  Application,
  Container,
  Graphics,
  Sprite,
  TilingSprite,
} from "pixi.js";
import type { GameConfig } from "../core/config";
import type { GameState, SimEvent, Ship } from "../core/types";
import { SPRITE_ROTATION_OFFSET, tex } from "./assets";

type ShipKind = "player" | "chaser" | "shooter";
type FxKind = "explosion" | "impact" | "muzzle";

interface Fx {
  sprite: Sprite;
  age: number;
  life: number;
  kind: FxKind;
  size: number;
}
interface ShipView {
  body: Sprite;
  fire: Sprite;
  bar: Graphics;
  hurt: number;
  kind: ShipKind;
}

const EXPLOSION_FRAMES = ["explosion_1", "explosion_2", "explosion_3"] as const;
/** Visual length of a ship relative to its collision radius (collision stays a circle). */
const SHIP_LENGTH_FACTOR = 3;

export class GameRenderer {
  readonly app = new Application();
  private world = new Container();
  private shipLayer = new Container();
  private projLayer = new Container();
  private fxLayer = new Container();
  private ships = new Map<number, ShipView>();
  private projectiles = new Map<number, Sprite>();
  private fx: Fx[] = [];
  private resizeObserver?: ResizeObserver;
  private initialized = false;
  private destroyed = false;

  constructor(private config: GameConfig) {}

  async init(host: HTMLElement) {
    await this.app.init({
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
      backgroundAlpha: 0,
      autoStart: false, // the Session drives the ticker so we control pause/manual clock
    });
    if (this.destroyed) {
      this.app.destroy(true, { children: true });
      return;
    } // Strict Mode safe
    this.initialized = true;
    host.appendChild(this.app.canvas);

    const { width, height, islands } = this.config.arena;
    // Water: a 64x64 tile repeated over the whole arena.
    const water = new TilingSprite({ texture: tex("water"), width, height });
    this.world.addChild(water);
    // Islands: a sand square with a smaller grass square on top (sand edge === collision edge).
    for (const i of islands) {
      this.addSquare(i.x, i.y, i.half, "island_sand");
      this.addSquare(i.x, i.y, i.half * 0.8, "island_grass");
    }
    this.world.addChild(this.shipLayer, this.projLayer, this.fxLayer);
    this.app.stage.addChild(this.world);

    this.resizeObserver = new ResizeObserver(() => this.resize(host));
    this.resizeObserver.observe(host);
    this.resize(host);
  }

  private addSquare(
    x: number,
    y: number,
    half: number,
    alias: "island_sand" | "island_grass",
  ) {
    const fill = new TilingSprite({
      texture: tex(alias),
      width: half * 2,
      height: half * 2,
    });
    fill.position.set(x - half, y - half);
    this.world.addChild(fill);
  }

  /** Fit the arena into the host keeping aspect ratio; world coordinates never change. */
  resize(host: HTMLElement) {
    if (!this.initialized) return;
    const w = host.clientWidth,
      h = host.clientHeight;
    if (w === 0 || h === 0) return;
    this.app.renderer.resize(w, h);
    const { width, height } = this.config.arena;
    const scale = Math.min(w / width, h / height);
    this.world.scale.set(scale);
    this.world.position.set((w - width * scale) / 2, (h - height * scale) / 2);
  }

  /** Convert screen -> arena coords (kept for pointer-based features and tests). */
  toArena(clientX: number, clientY: number) {
    const r = this.app.canvas.getBoundingClientRect();
    const s = this.world.scale.x;
    return {
      x: (clientX - r.left - this.world.x) / s,
      y: (clientY - r.top - this.world.y) / s,
    };
  }

  render(state: GameState, events: SimEvent[], dt: number) {
    if (!this.initialized) return;
    this.syncShips(state);
    this.syncProjectiles(state);
    for (const e of events) this.spawnFx(e);
    this.updateFx(dt);
    this.app.render();
  }

  private shipAlias(kind: ShipKind) {
    return kind === "player"
      ? "ship_player"
      : kind === "chaser"
        ? "ship_chaser"
        : "ship_shooter";
  }

  private makeShipView(s: Ship, kind: ShipKind): ShipView {
    const body = new Sprite(tex(this.shipAlias(kind)));
    body.anchor.set(0.5);
    // Scale by the sprite's LENGTH (texture height, assuming the bow points up in the PNG).
    const targetLength = s.radius * SHIP_LENGTH_FACTOR;
    body.scale.set(targetLength / body.texture.height);

    const fire = new Sprite(tex("fire_1"));
    fire.anchor.set(0.5);
    fire.width = fire.height = s.radius * 1.4;
    fire.visible = false;

    const bar = new Graphics();
    this.shipLayer.addChild(body, fire, bar);
    return { body, fire, bar, hurt: 0, kind };
  }

  private syncShips(state: GameState) {
    const alive = new Set<number>();
    const all: Array<{ s: Ship; kind: ShipKind }> = [
      { s: state.player, kind: "player" },
      ...state.enemies.map((e) => ({ s: e as Ship, kind: e.kind as ShipKind })),
    ];
    for (const { s, kind } of all) {
      alive.add(s.id);
      let v = this.ships.get(s.id);
      if (!v) {
        v = this.makeShipView(s, kind);
        this.ships.set(s.id, v);
      }

      const ratio = Math.max(0, s.hp / s.maxHp);

      v.body.position.set(s.pos.x, s.pos.y);
      v.body.rotation = s.heading + SPRITE_ROTATION_OFFSET;
      v.body.tint = v.hurt > 0 ? 0xff8080 : 0xffffff; // hit feedback
      v.hurt = Math.max(0, v.hurt - 1);

      // Visual deterioration by remaining health: fire grows as HP drops.
      v.fire.visible = ratio <= 0.5;
      if (v.fire.visible) {
        v.fire.texture = tex(ratio <= 0.25 ? "fire_2" : "fire_1");
        v.fire.position.set(s.pos.x, s.pos.y);
      }

      // Health bar above the ship (not rotated).
      const bw = 36;
      v.bar
        .clear()
        .rect(s.pos.x - bw / 2, s.pos.y - s.radius - 16, bw, 5)
        .fill(0x000000)
        .rect(
          s.pos.x - bw / 2 + 1,
          s.pos.y - s.radius - 15,
          (bw - 2) * ratio,
          3,
        )
        .fill(ratio > 0.5 ? 0x4caf50 : ratio > 0.25 ? 0xffc107 : 0xf44336);
    }
    for (const [id, v] of this.ships) {
      if (!alive.has(id)) {
        v.body.destroy();
        v.fire.destroy();
        v.bar.destroy();
        this.ships.delete(id);
      }
    }
  }

  private syncProjectiles(state: GameState) {
    const alive = new Set<number>();
    for (const p of state.projectiles) {
      alive.add(p.id);
      let spr = this.projectiles.get(p.id);
      if (!spr) {
        spr = new Sprite(tex("cannonball"));
        spr.anchor.set(0.5);
        spr.width = spr.height = p.radius * 2.5;
        this.projLayer.addChild(spr);
        this.projectiles.set(p.id, spr);
      }
      spr.position.set(p.pos.x, p.pos.y);
    }
    for (const [id, spr] of this.projectiles) {
      if (!alive.has(id)) {
        spr.destroy();
        this.projectiles.delete(id);
      }
    }
  }

  private spawnFx(e: SimEvent) {
    if (e.type === "score") return; // audio only
    const kind: FxKind =
      e.type === "explosion"
        ? "explosion"
        : e.type === "hit"
          ? "impact"
          : "muzzle";
    const size =
      kind === "explosion"
        ? e.type === "explosion" && e.big
          ? 96
          : 60
        : kind === "impact"
          ? 28
          : 22;
    const sprite = new Sprite(
      tex(
        kind === "explosion"
          ? EXPLOSION_FRAMES[0]
          : kind === "impact"
            ? "fire_2"
            : "fire_1",
      ),
    );
    sprite.anchor.set(0.5);
    sprite.position.set(e.pos.x, e.pos.y);
    sprite.width = sprite.height = size;
    this.fxLayer.addChild(sprite);
    this.fx.push({
      sprite,
      age: 0,
      life: kind === "explosion" ? 0.5 : 0.18,
      kind,
      size,
    });

    if (e.type === "hit") {
      // mark the closest ship as hurt for tint feedback
      let best: ShipView | undefined;
      let bd = 40;
      for (const [, v] of this.ships) {
        const d = Math.hypot(v.body.x - e.pos.x, v.body.y - e.pos.y);
        if (d < bd) {
          bd = d;
          best = v;
        }
      }
      if (best) best.hurt = 6;
    }
  }

  private updateFx(dt: number) {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i]!;
      f.age += dt;
      const t = f.age / f.life;
      if (t >= 1) {
        f.sprite.destroy();
        this.fx.splice(i, 1);
        continue;
      }
      if (f.kind === "explosion") {
        // Frame-by-frame animation: explosion_1 -> 2 -> 3.
        const frame =
          EXPLOSION_FRAMES[
            Math.min(
              EXPLOSION_FRAMES.length - 1,
              Math.floor(t * EXPLOSION_FRAMES.length),
            )
          ]!;
        f.sprite.texture = tex(frame);
        f.sprite.width = f.sprite.height = f.size * (0.7 + 0.5 * t);
      }
      f.sprite.alpha = f.kind === "explosion" ? 1 - t * t : 1 - t;
    }
  }

  destroy() {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    if (!this.initialized) return; // init() will clean itself up after it resolves
    this.ships.clear();
    this.projectiles.clear();
    this.fx = [];
    this.app.destroy(true, { children: true }); // textures stay cached in Assets (reused)
    this.initialized = false;
  }
}
