import { EMPTY_INPUT, type InputState } from "../core/types";

type Action = keyof InputState;

const KEYMAP: Record<string, Action> = {
  ArrowUp: "forward",
  KeyW: "forward",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  Space: "fireFront",
  KeyQ: "fireLeft",
  KeyE: "fireRight",
};

export class InputController {
  readonly state: InputState = { ...EMPTY_INPUT };
  private attached = false;

  private onKeyDown = (e: KeyboardEvent) => {
    const a = KEYMAP[e.code];
    if (!a) return;
    e.preventDefault(); // only reached while gameplay context is attached
    this.state[a] = true;
  };
  private onKeyUp = (e: KeyboardEvent) => {
    const a = KEYMAP[e.code];
    if (a) {
      e.preventDefault();
      this.state[a] = false;
    }
  };

  attach() {
    if (this.attached) return;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.attached = true;
  }
  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.attached = false;
    this.clear();
  }
  setAction(a: Action, down: boolean) {
    this.state[a] = down;
  } // touch buttons
  clear() {
    Object.assign(this.state, EMPTY_INPUT);
  }
}
