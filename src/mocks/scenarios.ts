import { delay, HttpResponse } from "msw";
import { Rng } from "../game/core/rng";

export type Scenario =
  | "success"
  | "empty"
  | "multi-page"
  | "slow"
  | "jitter"
  | "out-of-order"
  | "timeout"
  | "network-error"
  | "http-400"
  | "http-500"
  | "ranking-fails"
  | "history-fails"
  | "timeout-after-register"
  | "down-then-recover";

export const SCENARIOS: Scenario[] = [
  "success",
  "empty",
  "multi-page",
  "slow",
  "jitter",
  "out-of-order",
  "timeout",
  "network-error",
  "http-400",
  "http-500",
  "ranking-fails",
  "history-fails",
  "timeout-after-register",
  "down-then-recover",
];

const KEY = "pb.scenario";
export function getScenario(): Scenario {
  const q = new URLSearchParams(location.search).get("scenario");
  const v = (q ?? localStorage.getItem(KEY) ?? "success") as Scenario;
  return SCENARIOS.includes(v) ? v : "success";
}
export const setScenario = (s: Scenario) => localStorage.setItem(KEY, s);

const rng = new Rng(
  Number(new URLSearchParams(location.search).get("seed") ?? 42),
);
let calls = 0;

export type Endpoint = "ranking" | "history" | "register";

/** Runs BEFORE the handler logic. Returns a Response to short-circuit, or undefined to continue. */
export async function beforeHandler(
  ep: Endpoint,
): Promise<Response | undefined> {
  const s = getScenario();
  const n = ++calls;
  switch (s) {
    case "slow":
      await delay(3000);
      return;
    case "jitter":
      await delay(Math.round(rng.range(100, 2500)));
      return;
    case "out-of-order":
      await delay(n % 2 === 0 ? 100 : 2500);
      return; // later calls answer first
    case "timeout":
      await delay("infinite");
      return;
    case "network-error":
      return HttpResponse.error();
    case "http-400":
      return HttpResponse.json({ message: "Bad request" }, { status: 400 });
    case "http-500":
      return HttpResponse.json({ message: "Server error" }, { status: 500 });
    case "ranking-fails":
      if (ep === "ranking")
        return HttpResponse.json({ message: "Ranking down" }, { status: 503 });
      return;
    case "history-fails":
      if (ep === "history")
        return HttpResponse.json({ message: "History down" }, { status: 503 });
      return;
    case "down-then-recover": {
      if (ep !== "register") return;
      const st = JSON.parse(
        localStorage.getItem("pb.scenarioState") ?? '{"fails":0}',
      );
      if (st.fails < 3) {
        localStorage.setItem(
          "pb.scenarioState",
          JSON.stringify({ fails: st.fails + 1 }),
        );
        return HttpResponse.json(
          { message: "Service unavailable" },
          { status: 503 },
        );
      }
      return;
    }
    default:
      return;
  }
}

/** Runs AFTER the record was persisted: simulates "saved on server, client never got the response". */
export async function afterRegister(): Promise<void> {
  if (getScenario() === "timeout-after-register") {
    const st = JSON.parse(
      localStorage.getItem("pb.scenarioState") ?? '{"timedOut":false}',
    );
    if (!st.timedOut) {
      localStorage.setItem(
        "pb.scenarioState",
        JSON.stringify({ ...st, timedOut: true }),
      );
      await delay("infinite");
    }
  }
}
