import { Simulation } from "./core/sim";
import type { GameConfig } from "./core/config";
import { GameRenderer } from "./render/renderer";
import { InputController } from "./input/input";
import { createHudStore } from "./hudStore";
import { playSfx, sfxForEvent } from "./audio";
import type { EndReason } from "./core/types";

export interface MatchResult {
  score: number;
  durationSec: number;
  endReason: EndReason;
}

const STEP = 1 / 60; // fixed simulation step

export class GameSession {
  readonly input = new InputController();
  readonly store = createHudStore();
  readonly sim: Simulation;
  private renderer: GameRenderer;
  private acc = 0;
  private manual = false;
  private destroyed = false;
  private finished = false;
  private tick = (ticker: { deltaMS: number }) =>
    this.frame(ticker.deltaMS / 1000);

  constructor(
    config: GameConfig,
    seed: number,
    private onEnd: (r: MatchResult) => void,
  ) {
    this.sim = new Simulation(config, seed);
    this.renderer = new GameRenderer(this.sim.config);
  }

  async start(host: HTMLElement) {
    await this.renderer.init(host);
    if (this.destroyed) return; // StrictMode: unmounted while initializing
    this.input.attach();
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("blur", this.onBlur);
    this.renderer.app.ticker.add(this.tick);
    this.renderer.app.ticker.start();
    playSfx("start");
    this.publish();
  }

  // ----- pause -----
  pause() {
    this.sim.pause();
    this.input.clear();
    playSfx("pause");
    this.publish();
  }
  resume() {
    this.sim.resume();
    this.input.clear(); // never accumulate held keys from the paused period
    this.acc = 0; // nor accumulated time
    playSfx("resume");
    this.publish();
  }
  private onVisibility = () => {
    if (document.hidden) this.pause();
  };
  private onBlur = () => this.pause();

  // ----- loop -----
  private frame(dt: number) {
    if (this.manual) return;
    this.advance(dt);
  }

  /** Fixed-step accumulator: simulation results are independent of frame rate. */
  private advance(dt: number) {
    if (this.sim.state.status === "running") {
      this.acc += Math.min(dt, 0.1);
      while (this.acc >= STEP) {
        this.sim.step(STEP, this.input.state);
        this.acc -= STEP;
      }
    }
    const events = this.sim.drainEvents();
    // Audio lives OUTSIDE the simulation: it only reacts to the events the rules emitted.
    for (const e of events) {
      const key = sfxForEvent(e);
      if (key) playSfx(key);
    }
    this.renderer.render(this.sim.state, events, dt);
    this.publish();
    if (this.sim.state.status === "ended" && !this.finished) {
      this.finished = true;
      this.input.clear();
      playSfx(this.sim.state.endReason === "death" ? "over" : "complete");
      this.onEnd({
        score: this.sim.state.score,
        durationSec: Math.round(this.sim.state.time * 100) / 100,
        endReason: this.sim.state.endReason!,
      });
    }
  }

  private publish() {
    const s = this.sim.state;
    this.store.getState().sync({
      status: s.status,
      score: s.score,
      hp: s.player.hp,
      maxHp: s.player.maxHp,
      secondsLeft: Math.max(
        0,
        Math.ceil(this.sim.config.session.durationSec - s.time),
      ),
      endReason: s.endReason,
    });
  }

  // ----- test hooks (deterministic clock) -----
  enableManualClock() {
    this.manual = true;
  }
  advanceMs(ms: number) {
    // deterministic: runs real rules, real input, real rendering
    const steps = Math.round(ms / (STEP * 1000));
    for (let i = 0; i < steps; i++) this.advance(STEP);
  }

  destroy() {
    this.destroyed = true;
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("blur", this.onBlur);
    this.renderer.app.ticker?.remove(this.tick);
    this.input.detach();
    this.renderer.destroy();
    this.store.getState().reset();
  }
}
