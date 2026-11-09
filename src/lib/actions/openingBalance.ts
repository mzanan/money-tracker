"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionErrorMessage } from "@/lib/actionError";
import { isSupportedCurrency } from "@/lib/constants/currencies";
import { normalizeSource } from "@/lib/constants/sources";
import { amountValidationError } from "@/lib/currency";
import { sourceCurrencyError } from "@/lib/data/accounts";
import { getScaleOf } from "@/lib/data/cryptoAssets";
import {
  firstSourceDate,
  getLedgerRecord,
  postLedgerTransaction,
  transactionIdForExternalId,
} from "@/lib/data/ledgerWrites";
import { getUserSettings } from "@/lib/data/userSettings";
import { openingExternalId } from "@/lib/externalIds";
import { openingLines } from "@/lib/ledger/builders";
import { emptyDraft } from "@/lib/ledger/posting";
import { canTakeOpening } from "@/lib/openingBalance";
import { userToday } from "@/lib/preferences.server";
import { getUser } from "@/lib/session";

import type { ActionResult } from "./transactions";

const openingSchema = z.object({
  source: z.string().trim().min(1).max(32),
  currency: z.string().refine(isSupportedCurrency),
  amount: z.number().finite().positive(),
  occurredOn: z.iso.date("Invalid date (yyyy-MM-dd)").nullable(),
});

export type OpeningBalanceInput = z.infer<typeof openingSchema>;

export async function setOpeningBalance(
  input: OpeningBalanceInput,
): Promise<ActionResult> {
  const parsed = openingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid data" };
  const { currency, amount } = parsed.data;
  const source = normalizeSource(parsed.data.source);
  if (!source) return { ok: false, error: "Invalid account" };
  if (!canTakeOpening(source)) {
    return {
      ok: false,
      error: "Synced accounts can't take an opening balance",
    };
  }
  const amountError = amountValidationError(amount, currency);
  if (amountError) return { ok: false, error: amountError };

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  try {
    const currencyError = await sourceCurrencyError(
      user.id,
      source,
      currency,
      "own",
    );
    if (currencyError) return { ok: false, error: currencyError };
    const externalId = openingExternalId(currency);
    const existingId = await transactionIdForExternalId(
      user.id,
      source,
      externalId,
    );
    const existing = existingId
      ? await getLedgerRecord(user.id, existingId)
      : null;
    const occurredOn =
      parsed.data.occurredOn ??
      (await firstSourceDate(user.id, source)) ??
      (await userToday((await getUserSettings(user.id))?.timezone));
    await postLedgerTransaction(
      user.id,
      {
        ...emptyDraft(occurredOn),
        lines: openingLines(
          source,
          { amount, currency },
          occurredOn,
          await getScaleOf(),
        ),
        externalRefs: [{ origin: source, externalId }],
      },
      existing
        ? { replaceId: existing.movement.id, expected: existing.draft }
        : {},
    );
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Couldn't save the opening balance"),
    };
  }
}
