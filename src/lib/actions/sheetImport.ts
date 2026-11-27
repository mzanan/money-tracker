"use server";

import { z } from "zod";

import { isSupportedCurrency } from "@/lib/constants/currencies";
import { roundToScale } from "@/lib/currency";
import { csvExternalId } from "@/lib/csv/ledgerDraft";
import { findCandidatesForMany } from "@/lib/data/duplicates";
import { existingExternalRefs } from "@/lib/data/ledgerWrites";
import type { DuplicateStep } from "@/lib/constants/sheetImport";
import type { CandidateMatch } from "@/lib/imageExtract";
import { candidateMatchOf } from "@/lib/ledger/candidates";
import { getRates } from "@/lib/rates";
import { getUser } from "@/lib/session";
import { transactionContentHash } from "@/lib/transactions";
import { judgeDuplicates } from "@/lib/ai/duplicateJudge";
import { proposeSheetRecipe } from "@/lib/ai/sheetRecipe";
import {
  assignJudged,
  deterministicMatches,
  JUDGE_BATCH,
  type LadderRow,
} from "@/lib/sheetImport/dedupe";
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

const CheckRowSchema = z.object({
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  currency: z.string().nullable(),
  description: z.string(),
  fingerprintKey: z.string(),
  occurrence: z.number().int().positive(),
});

const ClaimInputSchema = z.object({
  source: z.string(),
  rows: z.array(CheckRowSchema),
});

const CheckInputSchema = ClaimInputSchema.extend({
  used: z.array(z.string()),
});

type CheckRow = z.infer<typeof CheckRowSchema>;

export type SheetClaimInput = z.infer<typeof ClaimInputSchema>;

export type SheetCheckInput = z.infer<typeof CheckInputSchema>;

export type SheetRowState = "new" | "already_imported" | "duplicate";

export interface SheetRowCheck {
  externalId: string;
  state: SheetRowState;
  step: DuplicateStep | null;
  match: CandidateMatch | null;
}

const JUDGE_FAILED =
  "Could not compare these rows with your records right now. Try again.";

interface ExactMatch {
  step: DuplicateStep;
  transactionId: string;
}

function legacyIdOf(row: CheckRow): string | null {
  return row.currency && isSupportedCurrency(row.currency)
    ? transactionContentHash({
        occurredOn: row.occurredOn,
        amount: roundToScale(row.amount, row.currency),
        currency: row.currency,
        description: row.description.trim() || null,
        kind: row.kind,
      }).slice(0, 32)
    : null;
}

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
    ? await existingExternalRefs(userId, source, [
        ...externalIds.map(csvExternalId),
        ...legacyIds.filter((id): id is string => id !== null),
      ])
    : new Map<string, string>();
  const exact = externalIds.map((id, index): ExactMatch | null => {
    const own = taken.get(csvExternalId(id));
    if (own) return { step: "external_id", transactionId: own };
    const legacy = legacyIds[index];
    const old = legacy ? taken.get(legacy) : undefined;
    return old ? { step: "legacy_hash", transactionId: old } : null;
  });
  return { externalIds, exact };
}

export async function claimSheetRows(
  input: SheetClaimInput,
): Promise<ActionResult<{ transactionIds: string[] }>> {
  const parsed = ClaimInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid rows" };
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const source = parsed.data.source.trim().toLowerCase();
  const { exact } = await exactMatchesFor(user.id, source, parsed.data.rows);
  return {
    ok: true,
    data: {
      transactionIds: exact.flatMap((match) =>
        match ? [match.transactionId] : [],
      ),
    },
  };
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
  const { externalIds, exact } = await exactMatchesFor(user.id, source, rows);
  const exactStep = (index: number): DuplicateStep | null =>
    exact[index]?.step ?? null;

  const ladderRows: (LadderRow | null)[] = rows.map((row, index) =>
    row.currency && isSupportedCurrency(row.currency) && !exactStep(index)
      ? { ...row, currency: row.currency }
      : null,
  );
  const queried = ladderRows.flatMap((row, index) =>
    row ? [{ index, row }] : [],
  );
  const rates = await getRates()
    .then((r) => r.rates)
    .catch(() => null);
  const used = new Set([
    ...parsed.data.used,
    ...exact.flatMap((match) => (match ? [match.transactionId] : [])),
  ]);
  const found = await findCandidatesForMany(
    user.id,
    queried.map(({ row }) => row),
    rates,
  );
  const candidates = rows.map(() => [] as (typeof found)[number]);
  queried.forEach(({ index }, i) => {
    candidates[index] = found[i].filter((c) => !used.has(c.id));
  });

  const { matches, pairs } = deterministicMatches(
    ladderRows,
    candidates,
    source,
  );
  let judged = matches;
  try {
    const same = new Set<string>();
    for (let i = 0; i < pairs.length; i += JUDGE_BATCH) {
      for (const id of await judgeDuplicates(pairs.slice(i, i + JUDGE_BATCH))) {
        same.add(id);
      }
    }
    judged = assignJudged(matches, pairs, same);
  } catch (error) {
    console.error("judgeDuplicates failed", error);
    return { ok: false, error: JUDGE_FAILED };
  }

  return {
    ok: true,
    data: {
      checks: externalIds.map((externalId, index) => {
        const exact = exactStep(index);
        const match = judged[index];
        return {
          externalId,
          state: exact ? "already_imported" : match ? "duplicate" : "new",
          step: exact ?? match?.step ?? null,
          match: match ? candidateMatchOf(match.candidate) : null,
        };
      }),
    },
  };
}
