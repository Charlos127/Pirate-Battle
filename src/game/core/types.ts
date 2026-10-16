export interface Vec {
  x: number;
  y: number;
}
export type EnemyKind = "chaser" | "shooter";
export type EndReason = "time" | "death";
export type MatchStatus = "running" | "paused" | "ended";

export interface InputState {
  forward: boolean;
  left: boolean;
  right: boolean;
  fireFront: boolean;
  fireLeft: boolean;
  fireRight: boolean;
}

export const EMPTY_INPUT: InputState = {
  forward: false,
  left: false,
  right: false,
  fireFront: false,
  fireLeft: false,
  fireRight: false,
};

export interface Ship {
  id: number;
  pos: Vec;
  heading: number;
  hp: number;
  maxHp: number;
  radius: number;
  dead: boolean;
}

export interface Player extends Ship {
  cooldowns: { front: number; left: number; right: number };
}

export interface Enemy extends Ship {
  kind: EnemyKind;
  cooldown: number;
}

export interface Projectile {
  id: number;
  owner: "player" | "enemy";
  pos: Vec;
  vel: Vec;
  damage: number;
  radius: number;
  ttl: number;
  dead: boolean;
}

export type SimEvent =
  | { type: "shot"; pos: Vec; owner: "player" | "enemy"; broadside?: boolean }
  | { type: "hit"; pos: Vec; target: "player" | "enemy" }
  | { type: "explosion"; pos: Vec; big: boolean }
  | { type: "score"; pos: Vec };

export interface GameState {
  status: MatchStatus;
  endReason: EndReason | null;
  time: number; // active seconds played
  score: number;
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
}
