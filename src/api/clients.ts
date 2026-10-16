import axios from "axios";
import {
  historyResponseSchema,
  rankingResponseSchema,
  registerResponseSchema,
  type MatchRecord,
} from "./contracts";

export const http = axios.create({
  baseURL: "/api",
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 5000),
});

// Every response is validated at the boundary: a contract drift becomes a ZodError (a query error),
// never a silent `undefined` deep inside a component.
export const fetchRanking = (
  configKey: string,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
) =>
  http
    .get("/ranking", { params: { configKey, page, pageSize }, signal })
    .then((r) => rankingResponseSchema.parse(r.data));

export const fetchHistory = (
  playerId: string,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
) =>
  http
    .get("/matches", { params: { playerId, page, pageSize }, signal })
    .then((r) => historyResponseSchema.parse(r.data));

/** Idempotent: the matchId is the idempotency key. Re-sending returns the existing record. */
export const registerMatch = (record: MatchRecord) =>
  http
    .post("/matches", record, {
      headers: { "Idempotency-Key": record.matchId },
    })
    .then((r) => registerResponseSchema.parse(r.data));
