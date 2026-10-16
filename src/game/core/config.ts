import { z } from "zod";

/** Square island: (x, y) is the centre, `half` is half the side length. */
export interface Island {
  x: number;
  y: number;
  half: number;
}

export interface ProjectileConfig {
  damage: number;
  speed: number;
  ttl: number;
  radius: number;
}

export interface GameConfig {
  session: { durationSec: number };
  spawn: {
    intervalSec: number;
    minDistanceFromPlayer: number;
    edgeMargin: number;
    maxAlive: number;
    weights: { chaser: number; shooter: number };
  };
  arena: { width: number; height: number; islands: Island[] };
  player: { maxHp: number; speed: number; turnSpeed: number; radius: number };
  weapons: {
    front: ProjectileConfig & { cooldown: number };
    side: ProjectileConfig & { cooldown: number; spacing: number };
  };
  chaser: {
    hp: number;
    speed: number;
    turnSpeed: number;
    radius: number;
    impactDamage: number;
  };
  shooter: {
    hp: number;
    speed: number;
    turnSpeed: number;
    radius: number;
    attackRange: number;
    cooldown: number;
    projectile: ProjectileConfig;
  };
}

export const DEFAULT_CONFIG: GameConfig = {
  session: { durationSec: 90 },
  spawn: {
    intervalSec: 2.5,
    minDistanceFromPlayer: 260,
    edgeMargin: 40,
    maxAlive: 12,
    weights: { chaser: 0.5, shooter: 0.5 },
  },
  arena: {
    width: 1280,
    height: 720,
    islands: [
      { x: 640, y: 360, half: 80 },
      { x: 220, y: 170, half: 48 },
      { x: 1040, y: 190, half: 52 },
      { x: 1040, y: 540, half: 60 },
      { x: 420, y: 520, half: 40 },
      { x: 880, y: 360, half: 32 },
    ],
  },
  player: { maxHp: 10, speed: 180, turnSpeed: 2.2, radius: 18 },
  weapons: {
    front: { cooldown: 0.4, damage: 1, speed: 520, ttl: 1.2, radius: 5 },
    side: {
      cooldown: 1.2,
      damage: 1,
      speed: 480,
      ttl: 0.9,
      radius: 5,
      spacing: 14,
    },
  },
  chaser: { hp: 2, speed: 130, turnSpeed: 1.8, radius: 16, impactDamage: 2 },
  shooter: {
    hp: 3,
    speed: 100,
    turnSpeed: 1.5,
    radius: 18,
    attackRange: 320,
    cooldown: 1.6,
    projectile: { damage: 1, speed: 380, ttl: 1.5, radius: 5 },
  },
};

// ---- Player-facing options (Options screen) ----
export interface Options {
  sessionSeconds: number;
  spawnSeconds: number;
}

export const OPTION_LIMITS = {
  sessionSeconds: { min: 60, max: 180 },
  spawnSeconds: { min: 0.5, max: 10 },
} as const;

export const DEFAULT_OPTIONS: Options = {
  sessionSeconds: 90,
  spawnSeconds: 2.5,
};

export type OptionErrors = Partial<Record<keyof Options, string>>;

const { sessionSeconds: S, spawnSeconds: P } = OPTION_LIMITS;

/** Single source of truth for option rules: form validation AND hydration of persisted data. */
export const optionsSchema = z.object({
  sessionSeconds: z.number().int().min(S.min).max(S.max),
  spawnSeconds: z.number().min(P.min).max(P.max),
});

const MESSAGES: Record<keyof Options, string> = {
  sessionSeconds: `Must be a whole number between ${S.min} and ${S.max} seconds.`,
  spawnSeconds: `Must be between ${P.min} and ${P.max} seconds.`,
};

export function validateOptions(o: Options): OptionErrors {
  const result = optionsSchema.safeParse(o);
  if (result.success) return {};
  const errors: OptionErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof Options | undefined;
    if (key) errors[key] = MESSAGES[key];
  }
  return errors;
}

/** Snapshot: deep clone so later changes never affect a running match. */
export function buildConfig(o: Options): GameConfig {
  const cfg = structuredClone(DEFAULT_CONFIG);
  cfg.session.durationSec = o.sessionSeconds;
  cfg.spawn.intervalSec = o.spawnSeconds;
  return cfg;
}

/** Key used to compare ranking entries only between equal configurations. */
export const configKey = (o: Options) =>
  `s${o.sessionSeconds}-e${o.spawnSeconds}`;
