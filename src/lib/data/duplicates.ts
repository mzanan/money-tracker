import { and, between, eq } from "drizzle-orm";

import { dayWindow } from "@/lib/dates";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";

import type { FxRates, Transaction } from "@/types/db";

export interface CandidateQuery {
  userId: string;
  occurredOn: string;
  amount: number;
  currency: string;
  kind: "income" | "expense";
}

export interface MatchCandidate {
  query: CandidateQuery;
  matches: Transaction[];
}

const DEFAULT_WINDOW_DAYS = 2;
const AMOUNT_TOLERANCE = 0.01;
const CROSS_CURRENCY_TOLERANCE = 0.05;

function isAmountMatch(
  query: CandidateQuery,
  tx: Transaction,
  rates: FxRates | null,
): boolean {
  if (tx.currency_original === query.currency) {
    return Math.abs(tx.amount_original - query.amount) <= AMOUNT_TOLERANCE;
  }
  if (!rates) return false;
  const queryRate = rates[query.currency];
  const txRate = rates[tx.currency_original];
  if (!queryRate || !txRate) return false;
  const queryUsd = query.amount / queryRate;
  const txUsd = tx.amount_original / txRate;
  const reference = Math.max(queryUsd, txUsd);
  return (
    reference > 0 &&
    Math.abs(queryUsd - txUsd) / reference <= CROSS_CURRENCY_TOLERANCE
  );
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

      const rows = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.user_id, query.userId),
            eq(transactions.kind, query.kind),
            between(transactions.occurred_on, start, end),
          ),
        );

      return {
        query,
        matches: rows.filter((tx) => isAmountMatch(query, tx, rates)),
      };
    }),
  );
}
