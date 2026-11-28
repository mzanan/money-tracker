import { dayWindow, daysAround } from "@/lib/dates";
import { relativeUsdDiff, toUsdPair } from "@/lib/currency";
import { getLedgerRecordsBetween } from "@/lib/data/ledgerWrites";
import { forUser } from "@/lib/db/scope";
import { flowCandidateOf, type FlowCandidate } from "@/lib/ledger/candidates";

import type { FxRates } from "@/types/db";

export interface CandidateQuery {
  userId: string;
  occurredOn: string;
  amount: number;
  currency: string;
  kind: "income" | "expense";
}

export interface MatchCandidate {
  query: CandidateQuery;
  matches: FlowCandidate[];
}

const DEFAULT_WINDOW_DAYS = 2;
const AMOUNT_TOLERANCE = 0.01;
const CROSS_CURRENCY_TOLERANCE = 0.05;

function amountsMatch(
  a: { amount: number; currency: string },
  b: { amount: number; currency: string },
  rates: FxRates | null,
): boolean {
  if (a.currency === b.currency) {
    return Math.abs(a.amount - b.amount) <= AMOUNT_TOLERANCE;
  }
  const usd = toUsdPair(a, b, rates);
  if (!usd) return false;
  const diff = relativeUsdDiff(usd.usdA, usd.usdB);
  return diff !== null && diff <= CROSS_CURRENCY_TOLERANCE;
}

export async function getFlowCandidatesBetween(
  userId: string,
  start: string,
  end: string,
): Promise<FlowCandidate[]> {
  const records = await getLedgerRecordsBetween(forUser(userId), start, end);
  return records.flatMap(({ movement }) => {
    const candidate = flowCandidateOf(movement);
    return candidate &&
      candidate.occurredOn >= start &&
      candidate.occurredOn <= end
      ? [candidate]
      : [];
  });
}

export async function findCrossSourceCandidates(
  queries: CandidateQuery[],
  rates: FxRates | null = null,
  windowDays = DEFAULT_WINDOW_DAYS,
): Promise<MatchCandidate[]> {
  if (queries.length === 0) return [];

  return Promise.all(
    queries.map(async (query) => {
      const { start, end } = dayWindow(query.occurredOn, windowDays);
      const pool = await getFlowCandidatesBetween(query.userId, start, end);
      return {
        query,
        matches: pool.filter(
          (candidate) =>
            candidate.kind === query.kind &&
            amountsMatch(
              { amount: query.amount, currency: query.currency },
              { amount: candidate.amount, currency: candidate.currency },
              rates,
            ),
        ),
      };
    }),
  );
}

export type FlowQuery = Omit<CandidateQuery, "userId">;

export async function findCandidatesForMany(
  userId: string,
  queries: FlowQuery[],
  rates: FxRates | null = null,
  windowDays = DEFAULT_WINDOW_DAYS,
): Promise<FlowCandidate[][]> {
  if (queries.length === 0) return [];
  const days = queries.map((q) => q.occurredOn).sort();
  const start = dayWindow(days[0], windowDays).start;
  const end = dayWindow(days[days.length - 1], windowDays).end;
  const byDay = new Map<string, FlowCandidate[]>();
  for (const candidate of await getFlowCandidatesBetween(userId, start, end)) {
    const list = byDay.get(candidate.occurredOn) ?? [];
    list.push(candidate);
    byDay.set(candidate.occurredOn, list);
  }
  return queries.map((query) =>
    daysAround(query.occurredOn, windowDays).flatMap((day) =>
      (byDay.get(day) ?? []).filter(
        (candidate) =>
          candidate.kind === query.kind &&
          amountsMatch(
            { amount: query.amount, currency: query.currency },
            { amount: candidate.amount, currency: candidate.currency },
            rates,
          ),
      ),
    ),
  );
}
