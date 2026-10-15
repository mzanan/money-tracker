"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { accountCurrencyError } from "@/lib/accountCurrencies";
import { actionErrorMessage } from "@/lib/actionError";
import { isSupportedCurrency } from "@/lib/constants/currencies";
import { labelForSource } from "@/lib/constants/sources";
import { amountValidationError, roundToScale } from "@/lib/currency";
import { getAccountCurrencies } from "@/lib/data/accounts";
import {
  getLedgerRecord,
  postLedgerTransaction,
} from "@/lib/data/ledgerWrites";
import { getScaleOf } from "@/lib/data/cryptoAssets";
import { creditedLines } from "@/lib/ledger/builders";
import { isInTransit } from "@/lib/ledger/movements";
import { getUser } from "@/lib/session";
import { creditDateError } from "@/lib/transfer";

import type { ActionResult } from "./transactions";

const creditTransferSchema = z.object({
  creditedOn: z.iso.date("Invalid date (yyyy-MM-dd)"),
  received: z.object({
    amount: z.number().finite().positive(),
    currency: z.string().refine(isSupportedCurrency),
  }),
  destinationFee: z.number().finite().nonnegative().optional(),
});

export type CreditTransferInput = z.infer<typeof creditTransferSchema>;

export async function creditTransfer(
  txId: string,
  input: CreditTransferInput,
): Promise<ActionResult> {
  const parsed = creditTransferSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid data" };
  const { creditedOn, received } = parsed.data;
  const destinationFee = parsed.data.destinationFee ?? 0;
  const amountError =
    amountValidationError(received.amount, received.currency) ??
    (destinationFee > 0
      ? amountValidationError(destinationFee, received.currency)
      : null);
  if (amountError) return { ok: false, error: amountError };

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const record = await getLedgerRecord(user.id, txId);
  if (!record) return { ok: false, error: "Transaction not found" };
  const { movement, draft } = record;
  const destination = draft.transitDestination;
  if (!isInTransit(movement) || !destination) {
    return { ok: false, error: "This transfer isn't in transit" };
  }
  const dateError = creditDateError(draft.occurredOn, creditedOn);
  if (dateError) return { ok: false, error: dateError };
  const currencies = await getAccountCurrencies(user.id, [destination]);
  const currencyError = accountCurrencyError({
    currency: received.currency,
    allowed: currencies[destination],
    accountLabel: labelForSource(destination),
    side: "received",
  });
  if (currencyError) return { ok: false, error: currencyError };

  try {
    const scaleOf = await getScaleOf();
    const lines = creditedLines({
      lines: draft.lines,
      destination,
      received: {
        amount: roundToScale(received.amount, received.currency),
        currency: received.currency,
      },
      destinationFee: roundToScale(destinationFee, received.currency),
      creditedOn,
      scaleOf,
    });
    await postLedgerTransaction(
      user.id,
      { ...draft, transitDestination: null, lines },
      { replaceId: movement.id, expected: draft },
    );
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Update failed"),
    };
  }
}
