import { z } from "zod";
import { optionsSchema } from "../game/core/config";

export const matchRecordSchema = z.object({
  matchId: z.string().min(1),
  playerId: z.string().min(1),
  playerName: z.string().min(1),
  finishedAt: z.string().datetime(),
  score: z.number().int().min(0),
  durationSec: z.number().min(0),
  endReason: z.enum(["time", "death"]),
  options: optionsSchema,
  configKey: z.string().min(1),
});
export type MatchRecord = z.infer<typeof matchRecordSchema>;

export const rankingEntrySchema = matchRecordSchema.extend({
  rank: z.number().int().min(1),
});
export type RankingEntry = z.infer<typeof rankingEntrySchema>;

const pageOf = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(1),
  });

export const rankingResponseSchema = pageOf(rankingEntrySchema);
export const historyResponseSchema = pageOf(matchRecordSchema);
export const registerResponseSchema = z.object({
  record: matchRecordSchema,
  created: z.boolean(),
});

export type RankingResponse = z.infer<typeof rankingResponseSchema>;
export type HistoryResponse = z.infer<typeof historyResponseSchema>;
export type RegisterResponse = z.infer<typeof registerResponseSchema>;
