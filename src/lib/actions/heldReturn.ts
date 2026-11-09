"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { accountCurrencyError } from "@/lib/accountCurrencies";
import { actionErrorMessage } from "@/lib/actionError";
import { isSupportedCurrency } from "@/lib/constants/currencies";
import {
  kindOfSource,
  labelForSource,
  normalizeSource,
} from "@/lib/constants/sources";
import { amountValidationError } from "@/lib/currency";
import { getAccountCurrencies, getHeldAccounts } from "@/lib/data/accounts";
import { getScaleOf } from "@/lib/data/cryptoAssets";
import {
  postLedgerTransactions,
  sourceBalanceMinor,
} from "@/lib/data/ledgerWrites";
import { heldReturnError } from "@/lib/accountPurpose";
import { flowLines, minorOf, transferPosting } from "@/lib/ledger/builders";
import { mirrorRef } from "@/lib/ledger/edits";
import { emptyDraft, type LedgerDraft } from "@/lib/ledger/posting";
import { getUser } from "@/lib/session";

import type { ActionResult } from "./transactions";

const heldReturnSchema = z.object({
  source: z.string().trim().min(1).max(32),
  currency: z.string().refine(isSupportedCurrency),
  received: z.number().finite().nonnegative(),
  destination: z.string().trim().max(32).nullable(),
  withheld: z.number().finite().nonnegative(),
  withheldNote: z.string().trim().max(280).nullable(),
  occurredOn: z.iso.date("Invalid date (yyyy-MM-dd)"),
});

export type HeldReturnInput = z.infer<typeof heldReturnSchema>;

export async function recordHeldReturn(
  input: HeldReturnInput,
): Promise<ActionResult> {
  const parsed = heldReturnSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid data" };
  const { currency, received, withheld, occurredOn } = parsed.data;
  const source = normalizeSource(parsed.data.source);
  const destination = parsed.data.destination
    ? normalizeSource(parsed.data.destination)
    : null;
  if (!source) return { ok: false, error: "Invalid account" };
  for (const amount of [received, withheld]) {
    if (amount === 0) continue;
    const amountError = amountValidationError(amount, currency);
    if (amountError) return { ok: false, error: amountError };
  }

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  try {
    const [held, scaleOf] = await Promise.all([
      getHeldAccounts(user.id),
      getScaleOf(),
    ]);
    const balance = await sourceBalanceMinor(user.id, source, currency);
    const shapeError = heldReturnError({
      source,
      destination,
      held,
      isSynced: destination !== null && kindOfSource(destination) === "api",
      receivedMinor:
        received > 0 ? minorOf({ amount: received, currency }, scaleOf) : 0,
      withheldMinor:
        withheld > 0 ? minorOf({ amount: withheld, currency }, scaleOf) : 0,
      balanceMinor: balance,
    });
    if (shapeError) return { ok: false, error: shapeError };

    const drafts: { id?: string; draft: LedgerDraft }[] = [];
    if (received > 0 && destination) {
      const accountCurrencies = await getAccountCurrencies(user.id, [
        destination,
      ]);
      const currencyError = accountCurrencyError({
        currency,
        allowed: accountCurrencies[destination],
        accountLabel: labelForSource(destination),
        side: "received",
      });
      if (currencyError) return { ok: false, error: currencyError };
      const id = crypto.randomUUID();
      const money = { amount: received, currency };
      drafts.push({
        id,
        draft: {
          ...emptyDraft(occurredOn),
          lines: transferPosting({
            origin: source,
            destination,
            sent: money,
            received: money,
            originFee: 0,
            destinationFee: 0,
            sentOn: occurredOn,
            receivedOn: occurredOn,
            scaleOf,
          }),
          externalRefs: [mirrorRef(destination, id)],
        },
      });
    }
    if (withheld > 0) {
      drafts.push({
        draft: {
          ...emptyDraft(occurredOn),
          note: parsed.data.withheldNote || null,
          lines: flowLines({
            kind: "expense",
            source,
            money: { amount: withheld, currency },
            occurredOn,
            scaleOf,
          }),
        },
      });
    }
    await postLedgerTransactions(user.id, drafts);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Couldn't record the return"),
    };
  }
}
