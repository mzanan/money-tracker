"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isSupportedCurrency } from "@/config/currencies";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { RatesUnavailableError } from "@/lib/rates";
import { getUser } from "@/lib/session";
import { buildTransactionRow } from "@/lib/transactions";

import { buildCurrencyContext, type ActionResult } from "./transactions";

const exchangeSchema = z.object({
  outAmount: z.number().finite().positive(),
  outCurrency: z.string().refine(isSupportedCurrency),
  inAmount: z.number().finite().positive(),
  inCurrency: z.string().refine(isSupportedCurrency),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type CashExchangeInput = z.infer<typeof exchangeSchema>;

export async function recordCashExchange(
  input: CashExchangeInput,
): Promise<ActionResult> {
  const parsed = exchangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid data" };
  const { outAmount, outCurrency, inAmount, inCurrency, occurredOn } =
    parsed.data;
  if (outCurrency === inCurrency) {
    return { ok: false, error: "Pick two different currencies" };
  }

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  let ctx;
  try {
    ctx = await buildCurrencyContext(user.id);
  } catch (error) {
    if (error instanceof RatesUnavailableError) {
      return { ok: false, error: "Exchange rates unavailable. Try again." };
    }
    return { ok: false, error: "Error fetching rates" };
  }
  if (!ctx) return { ok: false, error: "Settings not found" };

  const group = crypto.randomUUID();
  const note = `Cash exchange ${outCurrency} → ${inCurrency}`;
  const out = buildTransactionRow(
    {
      userId: user.id,
      kind: "expense",
      amount: outAmount,
      currency: outCurrency,
      occurredOn,
      note,
      externalId: `exchange:${group}:out`,
    },
    ctx,
  );
  const incoming = buildTransactionRow(
    {
      userId: user.id,
      kind: "income",
      amount: inAmount,
      currency: inCurrency,
      occurredOn,
      note,
      externalId: `exchange:${group}:in`,
    },
    ctx,
  );
  if (!out || !incoming) {
    return { ok: false, error: "No rate for one of the currencies" };
  }

  try {
    await db.insert(transactions).values([
      { ...out, transfer_group: group },
      { ...incoming, transfer_group: group },
    ]);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Insert failed",
    };
  }
}
