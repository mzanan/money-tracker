import { eq } from "drizzle-orm";
import { cache } from "react";

import { applyCostBasis, type CostBasisResult } from "@/lib/costBasis";
import { getAccountCurrencies } from "@/lib/data/accounts";
import { getUserSettings } from "@/lib/data/userSettings";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";

export const getValuedTransactions = cache(
  async (userId: string): Promise<CostBasisResult> => {
    const [stored, accountCurrencies, settings] = await Promise.all([
      db.select().from(transactions).where(eq(transactions.user_id, userId)),
      getAccountCurrencies(userId),
      getUserSettings(userId),
    ]);
    return applyCostBasis(
      stored,
      accountCurrencies,
      settings?.base_currency ?? "USD",
    );
  },
);
