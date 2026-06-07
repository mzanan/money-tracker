import { addDays, format, subDays } from "date-fns";
import { and, between, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";

import type { Transaction } from "@/types/db";

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

export async function findCrossSourceCandidates(
  queries: CandidateQuery[],
  windowDays = DEFAULT_WINDOW_DAYS,
): Promise<MatchCandidate[]> {
  if (queries.length === 0) return [];

  return Promise.all(
    queries.map(async (query) => {
      const start = format(
        subDays(new Date(`${query.occurredOn}T00:00:00Z`), windowDays),
        "yyyy-MM-dd",
      );
      const end = format(
        addDays(new Date(`${query.occurredOn}T00:00:00Z`), windowDays),
        "yyyy-MM-dd",
      );

      const matches = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.user_id, query.userId),
            eq(transactions.kind, query.kind),
            eq(transactions.currency_original, query.currency),
            between(transactions.occurred_on, start, end),
            sql`abs(${transactions.amount_original} - ${query.amount}) <= ${AMOUNT_TOLERANCE}`,
          ),
        );

      return { query, matches };
    }),
  );
}
