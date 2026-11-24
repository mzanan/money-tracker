"use server";

import { z } from "zod";

import { isSupportedCurrency } from "@/lib/constants/currencies";
import { roundToScale } from "@/lib/currency";
import { csvExternalId } from "@/lib/csv/ledgerDraft";
import { findCandidatesForMany } from "@/lib/data/duplicates";
import { existingExternalIds } from "@/lib/data/ledgerWrites";
import type { CandidateMatch } from "@/lib/imageExtract";
import { candidateMatchOf } from "@/lib/ledger/candidates";
import { getRates } from "@/lib/rates";
import { getUser } from "@/lib/session";
import { transactionContentHash } from "@/lib/transactions";
import { proposeSheetRecipe } from "@/lib/ai/sheetRecipe";
import { sheetFingerprint } from "@/lib/sheetImport/fingerprint";
import { MAX_ENCODED_CHARS } from "@/lib/sheetImport/encode";
import type { SheetRecipe } from "@/lib/sheetImport/recipe";

import type { ActionResult } from "./transactions";


export async function readSheetLayout(
  encodedWorkbook: string,
): Promise<ActionResult<{ recipe: SheetRecipe }>> {
  if (typeof encodedWorkbook !== "string" || !encodedWorkbook.trim()) {
    return { ok: false, error: "The file is empty" };
  }
  if (encodedWorkbook.length > MAX_ENCODED_CHARS) {
    return { ok: false, error: "The file is too large to read" };
  }
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  try {
    return {
      ok: true,
      data: { recipe: await proposeSheetRecipe(encodedWorkbook) },
    };
  } catch (error) {
    console.error("readSheetLayout failed", error);
    return {
      ok: false,
      error: "Could not read this spreadsheet right now. Try again later.",
    };
  }
}

const CheckInputSchema = z.object({
  source: z.string(),
  rows: z.array(
    z.object({
      occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      kind: z.enum(["income", "expense"]),
      amount: z.number().positive(),
      currency: z.string().nullable(),
      description: z.string(),
      fingerprintKey: z.string(),
      occurrence: z.number().int().positive(),
    }),
  ),
});

export type SheetCheckInput = z.infer<typeof CheckInputSchema>;

export interface SheetRowCheck {
  externalId: string;
  alreadyImported: boolean;
  matches: CandidateMatch[];
}

export async function checkSheetRows(
  input: SheetCheckInput,
): Promise<ActionResult<{ checks: SheetRowCheck[] }>> {
  const parsed = CheckInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid rows" };
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { rows } = parsed.data;
  const source = parsed.data.source.trim().toLowerCase();
  const externalIds = rows.map((row) =>
    sheetFingerprint(row.fingerprintKey, row.occurrence),
  );
  const legacyIds = rows.map((row) =>
    row.currency && isSupportedCurrency(row.currency)
      ? transactionContentHash({
          occurredOn: row.occurredOn,
          amount: roundToScale(row.amount, row.currency),
          currency: row.currency,
          description: row.description.trim() || null,
          kind: row.kind,
        }).slice(0, 32)
      : null,
  );
  const taken = source
    ? await existingExternalIds(user.id, source, [
        ...externalIds.map(csvExternalId),
        ...legacyIds.filter((id): id is string => id !== null),
      ])
    : new Set<string>();
  const imported = (index: number) =>
    taken.has(csvExternalId(externalIds[index])) ||
    Boolean(legacyIds[index] && taken.has(legacyIds[index]));

  const queries = rows.flatMap((row, index) =>
    row.currency && isSupportedCurrency(row.currency) && !imported(index)
      ? [{ index, query: { ...row, currency: row.currency } }]
      : [],
  );
  const rates = await getRates()
    .then((r) => r.rates)
    .catch(() => null);
  const found = await findCandidatesForMany(
    user.id,
    queries.map(({ query }) => query),
    rates,
  );
  const matchesByRow = new Map(
    queries.map(({ index }, i) => [index, found[i].map(candidateMatchOf)]),
  );

  return {
    ok: true,
    data: {
      checks: externalIds.map((externalId, index) => ({
        externalId,
        alreadyImported: imported(index),
        matches: matchesByRow.get(index) ?? [],
      })),
    },
  };
}
