import { http, HttpResponse } from "msw";
import { matchRecordSchema } from "../api/contracts";
import { rankRecords } from "../api/ranking";
import { readDb, writeDb } from "./db";
import { afterRegister, beforeHandler, getScenario } from "./scenarios";

function paginate<T>(all: T[], page: number, pageSize: number) {
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    items: all.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total,
    totalPages,
  };
}

const params = (req: Request) => {
  const u = new URL(req.url).searchParams;
  return {
    page: Math.max(1, Number(u.get("page") ?? 1)),
    pageSize: Math.min(50, Number(u.get("pageSize") ?? 10)),
    u,
  };
};

declare global {
  interface Window {
    __blockShips?: boolean;
  }
}

export const handlers = [
  // page.route() can't see requests served through the MSW service worker, so E2E fails assets here.
  http.get("/assets/png/*/ships/*", () =>
    typeof window !== "undefined" && window.__blockShips
      ? HttpResponse.error()
      : undefined,
  ),

  http.get("/api/ranking", async ({ request }) => {
    const early = await beforeHandler("ranking");
    if (early) return early;
    const { page, pageSize, u } = params(request);
    if (getScenario() === "empty")
      return HttpResponse.json(paginate([], page, pageSize));
    const key = u.get("configKey");
    const same = readDb().filter((r) => !key || r.configKey === key); // same configuration only
    return HttpResponse.json(paginate(rankRecords(same), page, pageSize));
  }),

  http.get("/api/matches", async ({ request }) => {
    const early = await beforeHandler("history");
    if (early) return early;
    const { page, pageSize, u } = params(request);
    if (getScenario() === "empty")
      return HttpResponse.json(paginate([], page, pageSize));
    const mine = readDb()
      .filter((r) => r.playerId === u.get("playerId"))
      .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
    return HttpResponse.json(paginate(mine, page, pageSize));
  }),

  http.post("/api/matches", async ({ request }) => {
    const early = await beforeHandler("register");
    if (early) return early;
    const parsed = matchRecordSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return HttpResponse.json(
        { message: "Invalid match record", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const body = parsed.data;
    const db = readDb();
    const existing = db.find((r) => r.matchId === body.matchId);
    if (existing)
      return HttpResponse.json({ record: existing, created: false }); // idempotent
    writeDb([...db, body]);
    await afterRegister(); // may hang => client times out, record already saved
    return HttpResponse.json({ record: body, created: true }, { status: 201 });
  }),
];
