import {
  QueryClient,
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { ZodError } from "zod";
import { fetchHistory, fetchRanking, registerMatch } from "./clients";
import { addPending, getPending, removePending } from "../store/pendingStore";
import type { MatchRecord } from "./contracts";

/** Retry transient failures only: never contract errors (Zod) nor 4xx responses. */
const shouldRetry = (count: number, error: unknown) =>
  count < 2 &&
  !(error instanceof ZodError) &&
  !(isAxiosError(error) && (error.response?.status ?? 500) < 500);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      staleTime: 10_000,
      refetchOnWindowFocus: true,
    },
  },
});

export const PAGE_SIZE = 10;

export const useRanking = (configKey: string, page: number) =>
  useQuery({
    // page + configKey in the key => a late response for page 1 can never overwrite page 2
    queryKey: ["ranking", configKey, page],
    queryFn: ({ signal }) => fetchRanking(configKey, page, PAGE_SIZE, signal), // aborted when key changes
    placeholderData: keepPreviousData,
    refetchOnMount: "always", // refresh when the tab is shown again
  });

export const useHistory = (playerId: string, page: number) =>
  useQuery({
    queryKey: ["history", playerId, page],
    queryFn: ({ signal }) => fetchHistory(playerId, page, PAGE_SIZE, signal),
    placeholderData: keepPreviousData,
    refetchOnMount: "always",
  });

export function useSubmitMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["register-match"],
    mutationFn: (r: MatchRecord) => {
      addPending(r);
      return registerMatch(r);
    }, // persisted BEFORE sending
    retry: 3,
    retryDelay: (a) => Math.min(500 * 2 ** a, 4000),
    onSuccess: (_d, r) => {
      removePending(r.matchId);
      qc.invalidateQueries({ queryKey: ["ranking"] }); // both tabs updated
      qc.invalidateQueries({ queryKey: ["history"] });
    },
  });
}

/** Called on app start and on the result screen "Retry" button. */
export async function flushPending(qc: QueryClient) {
  for (const r of getPending()) {
    try {
      await registerMatch(r);
      removePending(r.matchId);
    } catch {
      /* keep for later */
    }
  }
  qc.invalidateQueries({ queryKey: ["ranking"] });
  qc.invalidateQueries({ queryKey: ["history"] });
}
