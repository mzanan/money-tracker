"use server";

import { z } from "zod";

import { judgeAllDuplicates } from "@/lib/ai/duplicateJudge";
import { proposeSheetRecipe } from "@/lib/ai/sheetRecipe";
import { SHEET_REQUEST_ROWS } from "@/lib/constants/sheetImport";
import { findCandidatesForMany } from "@/lib/data/duplicates";
import { existingExternalRefs } from "@/lib/data/ledgerWrites";
import { getRates } from "@/lib/rates";
import { getUser } from "@/lib/session";
import {
  CheckRowSchema,
  type CheckRow,
  type SheetRowCheck,
} from "@/lib/sheetImport/check";
import {
  assignJudged,
  checksOf,
  candidatesByRow,
  deterministicMatches,
  exactTransactionIds,
  exactLookupIds,
  exactMatchesOf,
  ladderRowsOf,
  legacyIdOf,
  usedTransactionIds,
  type ExactMatch,
} from "@/lib/sheetImport/dedupe";
import { MAX_ENCODED_CHARS } from "@/lib/sheetImport/encode";
import { sheetFingerprint } from "@/lib/sheetImport/fingerprint";
import type { SheetRecipe } from "@/lib/sheetImport/recipe";

import type { ActionResult } from "./transactions";

export async function readSheetLayout(
  encodedWorkbook: string,
): Promise<ActionResult<{ recipe: SheetRecipe }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const workbook = EncodedWorkbookSchema.safeParse(encodedWorkbook);
  if (!workbook.success) {
    return {
      ok: false,
      error:
        typeof encodedWorkbook === "string" &&
        encodedWorkbook.length > MAX_ENCODED_CHARS
          ? "The file is too large to read"
          : "The file is empty",
    };
  }
  try {
    return {
      ok: true,
      data: { recipe: await proposeSheetRecipe(workbook.data) },
    };
  } catch (error) {
    console.error("readSheetLayout failed", error);
    return {
      ok: false,
      error: "Could not read this spreadsheet right now. Try again later.",
    };
  }
}

const EncodedWorkbookSchema = z
  .string()
  .max(MAX_ENCODED_CHARS)
  .refine((text) => text.trim().length > 0);

const ClaimInputSchema = z.object({
  source: z.string(),
  rows: z.array(CheckRowSchema).max(SHEET_REQUEST_ROWS),
});

const CheckInputSchema = ClaimInputSchema.extend({
  used: z.array(z.string()),
});

export type SheetClaimInput = z.infer<typeof ClaimInputSchema>;

export type SheetCheckInput = z.infer<typeof CheckInputSchema>;

const JUDGE_FAILED =
  "Could not compare these rows with your records right now. Try again.";

async function exactMatchesFor(
  userId: string,
  source: string,
  rows: CheckRow[],
): Promise<{ externalIds: string[]; exact: (ExactMatch | null)[] }> {
  const externalIds = rows.map((row) =>
    sheetFingerprint(row.fingerprintKey, row.occurrence),
  );
  const legacyIds = rows.map(legacyIdOf);
  const taken = source
    ? await existingExternalRefs(
        userId,
        source,
        exactLookupIds(externalIds, legacyIds),
      )
    : new Map<string, string>();
  return { externalIds, exact: exactMatchesOf(externalIds, legacyIds, taken) };
}

export async function claimSheetRows(
  input: SheetClaimInput,
): Promise<ActionResult<{ transactionIds: string[] }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const parsed = ClaimInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid rows" };
  const source = parsed.data.source.trim().toLowerCase();
  const { exact } = await exactMatchesFor(user.id, source, parsed.data.rows);
  return {
    ok: true,
    data: { transactionIds: exactTransactionIds(exact) },
  };
}

export async function checkSheetRows(
  input: SheetCheckInput,
): Promise<ActionResult<{ checks: SheetRowCheck[] }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const parsed = CheckInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid rows" };

  const { rows } = parsed.data;
  const source = parsed.data.source.trim().toLowerCase();
  const { externalIds, exact } = await exactMatchesFor(user.id, source, rows);
  const ladderRows = ladderRowsOf(rows, exact);
  const rates = await getRates()
    .then((r) => r.rates)
    .catch(() => null);
  const used = usedTransactionIds(parsed.data.used, exact);
  const found = await findCandidatesForMany(
    user.id,
    ladderRows.flatMap((row) => (row ? [row] : [])),
    rates,
  );
  const candidates = candidatesByRow(ladderRows, found, used);

  const { matches, pairs } = deterministicMatches(
    ladderRows,
    candidates,
    source,
  );
  try {
    const same = await judgeAllDuplicates(pairs);
    return {
      ok: true,
      data: {
        checks: checksOf(
          externalIds,
          exact,
          assignJudged(matches, pairs, same),
        ),
      },
    };
  } catch (error) {
    console.error("judgeDuplicates failed", error);
    return { ok: false, error: JUDGE_FAILED };
  }
}
