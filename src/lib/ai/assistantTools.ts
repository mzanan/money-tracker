import { tool } from "ai";
import { z } from "zod";

import {
  getBalance,
  getDailySpend,
  getPeriodSummary,
  getTopCategories,
  searchTransactions,
} from "@/lib/data/assistant";

export interface AssistantContext {
  userId: string;
  baseCurrency: string;
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD");

const kind = z.enum(["income", "expense"]);

export function buildAssistantTools({ userId, baseCurrency }: AssistantContext) {
  return {
    getBalance: tool({
      description:
        "Lifetime balance for the user: total income, total expense and net, in the base currency.",
      inputSchema: z.object({}),
      execute: () => getBalance(userId, baseCurrency),
    }),
    getPeriodSummary: tool({
      description:
        "Income, expense and net for an inclusive date range. Use for questions like 'how much did I spend this month'.",
      inputSchema: z.object({
        from: isoDate.describe("Start date, inclusive"),
        to: isoDate.describe("End date, inclusive"),
      }),
      execute: ({ from, to }) =>
        getPeriodSummary(userId, baseCurrency, from, to),
    }),
    getDailySpend: tool({
      description:
        "Day-by-day income/expense/net across an inclusive date range. Use for daily spend questions.",
      inputSchema: z.object({
        from: isoDate.describe("Start date, inclusive"),
        to: isoDate.describe("End date, inclusive"),
      }),
      execute: ({ from, to }) => getDailySpend(userId, baseCurrency, from, to),
    }),
    getTopCategories: tool({
      description:
        "Top spending or income categories, ranked by total in the base currency.",
      inputSchema: z.object({
        from: isoDate.describe("Start date, inclusive").optional(),
        to: isoDate.describe("End date, inclusive").optional(),
        kind: kind.default("expense"),
        limit: z.number().int().min(1).max(20).default(5),
      }),
      execute: ({ from, to, kind, limit }) =>
        getTopCategories(userId, baseCurrency, { from, to, kind, limit }),
    }),
    searchTransactions: tool({
      description:
        "List individual transactions, optionally filtered by date range, kind, or a text query against note and category.",
      inputSchema: z.object({
        from: isoDate.describe("Start date, inclusive").optional(),
        to: isoDate.describe("End date, inclusive").optional(),
        query: z
          .string()
          .describe("Text to match in note or category")
          .optional(),
        kind: kind.optional(),
        limit: z.number().int().min(1).max(50).default(10),
      }),
      execute: ({ from, to, query, kind, limit }) =>
        searchTransactions(userId, baseCurrency, {
          from,
          to,
          query,
          kind,
          limit,
        }),
    }),
  };
}
