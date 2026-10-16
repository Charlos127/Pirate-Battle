// @vitest-environment jsdom
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { setupServer } from "msw/node";
import { handlers } from "./handlers";
import { resetDb } from "./db";
import { setScenario } from "./scenarios";
import {
  historyResponseSchema,
  rankingResponseSchema,
  registerResponseSchema,
} from "../api/contracts";

const server = setupServer(...handlers);
const url = (p: string) => new URL(p, location.origin).toString();

const record = (over = {}) => ({
  matchId: "m-1",
  playerId: "me",
  playerName: "You",
  finishedAt: "2026-10-15T20:00:00.000Z",
  score: 7,
  durationSec: 60,
  endReason: "time" as const,
  options: { sessionSeconds: 90, spawnSeconds: 2.5 },
  configKey: "s90-e2.5",
  ...over,
});
const post = (body: unknown) =>
  fetch(url("/api/matches"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => {
  resetDb();
  setScenario("success");
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("ranking & history contracts", () => {
  it("ranking response matches the contract and is sorted", async () => {
    const body = await (
      await fetch(url("/api/ranking?configKey=s90-e2.5&page=1&pageSize=10"))
    ).json();
    const parsed = rankingResponseSchema.parse(body);
    const scores = parsed.items.map((i) => i.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(parsed.totalPages).toBeGreaterThan(1); // multi-page fixtures
  });
  it("empty scenario returns a valid empty page", async () => {
    setScenario("empty");
    const body = historyResponseSchema.parse(
      await (
        await fetch(url("/api/matches?playerId=me&page=1&pageSize=10"))
      ).json(),
    );
    expect(body.items).toEqual([]);
  });
});

describe("registration is idempotent", () => {
  it("re-sending the same matchId does not duplicate", async () => {
    const first = registerResponseSchema.parse(
      await (await post(record())).json(),
    );
    const second = registerResponseSchema.parse(
      await (await post(record())).json(),
    );
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    const hist = historyResponseSchema.parse(
      await (
        await fetch(url("/api/matches?playerId=me&page=1&pageSize=10"))
      ).json(),
    );
    expect(hist.items.filter((i) => i.matchId === "m-1")).toHaveLength(1);
    const rank = rankingResponseSchema.parse(
      await (
        await fetch(url("/api/ranking?configKey=s90-e2.5&page=1&pageSize=50"))
      ).json(),
    );
    expect(rank.items.filter((i) => i.matchId === "m-1")).toHaveLength(1);
  });
  it("rejects an invalid body with 400", async () => {
    expect((await post({ matchId: "x" })).status).toBe(400);
  });
  it("ranking compares only equal configurations", async () => {
    await post(
      record({
        matchId: "other",
        configKey: "s60-e1",
        options: { sessionSeconds: 60, spawnSeconds: 1 },
      }),
    );
    const rank = rankingResponseSchema.parse(
      await (
        await fetch(url("/api/ranking?configKey=s90-e2.5&page=1&pageSize=50"))
      ).json(),
    );
    expect(rank.items.some((i) => i.matchId === "other")).toBe(false);
  });
});
