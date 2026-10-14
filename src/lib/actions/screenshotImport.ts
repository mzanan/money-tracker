"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { ActionError } from "@/lib/actionError";
import { normalizeSource } from "@/lib/constants/sources";
import { isValidAmountForCurrency, roundForCurrency } from "@/lib/currency";
import { daysBefore, isValidCalendarDate, todayInTz } from "@/lib/dates";
import { db } from "@/lib/db";
import { user_settings } from "@/lib/db/schema";
import { findCrossSourceCandidates } from "@/lib/data/duplicates";
import {
  deleteLedgerTransactions,
  externalIdsWithPrefix,
  getLedgerRecord,
  getScaleOf,
  postLedgerTransaction,
} from "@/lib/data/ledgerWrites";
import { EXTERNAL_ID_PREFIX } from "@/lib/externalIds";
import { candidateMatchOf } from "@/lib/ledger/candidates";
import { flowLines } from "@/lib/ledger/builders";
import { feeOnlyDraft, isSyncedMovement } from "@/lib/ledger/edits";
import { simpleFlow } from "@/lib/ledger/movements";
import type { LedgerDraft } from "@/lib/ledger/posting";
import { hasStorageScale } from "@/lib/ledger/scale";
import { resolveTimezone } from "@/lib/preferences.server";
import { getRates } from "@/lib/rates";
import { getUser } from "@/lib/session";
import { manualFeeNote, transactionContentHash } from "@/lib/transactions";

import type { ActionResult } from "./transactions";

const SHARE_COOKIE = "mt_share_payload";

export async function clearSharePayload(): Promise<void> {
  const jar = await cookies();
  jar.delete(SHARE_COOKIE);
}

export interface ScreenshotRow {
  id: string;
  kind: "income" | "expense";
  amount: number;
  currency: string;
  occurredOn: string | null;
  description: string | null;
  source: string;
  replaceId: string | null;
}

export type ScreenshotRowStatus =
  | "imported"
  | "duplicate"
  | "invalid_currency"
  | "invalid_amount"
  | "fractional_amount"
  | "invalid_date"
  | "invalid_source"
  | "failed";

export interface ScreenshotRowResult {
  id: string;
  status: ScreenshotRowStatus;
}

async function nextExternalId(
  userId: string,
  source: string,
  baseHash: string,
): Promise<string> {
  const prefix = `${EXTERNAL_ID_PREFIX.screenshot}${baseHash}`;
  const taken = await externalIdsWithPrefix(userId, source, prefix);
  if (!taken.has(prefix)) return prefix;
  let i = 1;
  while (taken.has(`${prefix}:${i}`)) i++;
  return `${prefix}:${i}`;
}

export async function importScreenshotRows(input: {
  rows: ScreenshotRow[];
}): Promise<
  ActionResult<{ imported: number; results: ScreenshotRowResult[] }>
> {
  if (input.rows.length === 0) {
    return { ok: false, error: "Nothing selected" };
  }

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const settings = await db
    .select({ timezone: user_settings.timezone })
    .from(user_settings)
    .where(eq(user_settings.user_id, user.id))
    .limit(1)
    .then((rows) => rows[0]);
  if (!settings) return { ok: false, error: "Settings not found" };

  const scaleOf = await getScaleOf();
  const today = todayInTz(await resolveTimezone(settings.timezone));
  const oldestPlausible = daysBefore(today, 365);

  let imported = 0;
  const results: ScreenshotRowResult[] = [];

  for (const row of input.rows) {
    const source = normalizeSource(row.source);
    if (!source) {
      results.push({ id: row.id, status: "invalid_source" });
      continue;
    }
    if (!hasStorageScale(row.currency, scaleOf)) {
      results.push({ id: row.id, status: "invalid_currency" });
      continue;
    }
    if (!isValidAmountForCurrency(row.amount, row.currency)) {
      results.push({ id: row.id, status: "fractional_amount" });
      continue;
    }
    const amount = roundForCurrency(row.amount, row.currency);
    if (!Number.isFinite(amount) || amount <= 0) {
      results.push({ id: row.id, status: "invalid_amount" });
      continue;
    }
    let occurredOn = row.occurredOn ?? today;
    if (!isValidCalendarDate(occurredOn)) {
      results.push({ id: row.id, status: "invalid_date" });
      continue;
    }
    if (occurredOn > today || occurredOn < oldestPlausible) occurredOn = today;

    try {
      const baseHash = transactionContentHash({
        occurredOn,
        amount,
        currency: row.currency,
        description: row.description,
        kind: row.kind,
      }).slice(0, 24);
      const externalId = await nextExternalId(user.id, source, baseHash);
      const draft: LedgerDraft = {
        occurredOn,
        occurredAt: new Date().toISOString(),
        note: row.description?.trim() || null,
        comment: null,
        tags: [],
        recurringId: null,
        isFixed: null,
        budgetMonth: null,
        lines: flowLines({
          kind: row.kind,
          source,
          money: { amount, currency: row.currency },
          occurredOn,
          scaleOf,
        }),
        externalRefs: [{ origin: source, externalId }],
      };

      await db.transaction(async (dbTx) => {
        const replaced = row.replaceId
          ? await getLedgerRecord(user.id, row.replaceId, dbTx)
          : null;
        if (
          row.replaceId &&
          (!replaced ||
            !simpleFlow(replaced.movement) ||
            isSyncedMovement(replaced.movement))
        ) {
          throw new ActionError("Replaced movement not found");
        }
        await postLedgerTransaction(user.id, draft, { executor: dbTx });
        if (!replaced) return;
        await deleteLedgerTransactions(user.id, [replaced.movement.id], dbTx);
        const fees = feeOnlyDraft(
          replaced.draft,
          manualFeeNote(replaced.draft.note),
        );
        if (fees) {
          await postLedgerTransaction(user.id, fees, { executor: dbTx });
        }
      });
      imported += 1;
      results.push({ id: row.id, status: "imported" });
    } catch {
      results.push({ id: row.id, status: "failed" });
    }
  }

  if (imported > 0) {
    revalidatePath("/", "layout");
  }

  return { ok: true, data: { imported, results } };
}

export async function previewCandidatesAction(
  rows: Array<{
    occurredOn: string | null;
    amount: number;
    currency: string;
    kind: "income" | "expense";
  }>,
): Promise<
  ActionResult<{
    candidates: Array<{
      index: number;
      matches: Array<{
        id: string;
        source: string;
        occurredOn: string;
        amount: number;
        currency: string;
        kind: "income" | "expense";
        note: string | null;
      }>;
    }>;
  }>
> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const settings = await db
    .select({ timezone: user_settings.timezone })
    .from(user_settings)
    .where(eq(user_settings.user_id, user.id))
    .limit(1)
    .then((rows) => rows[0]);
  const today = todayInTz(await resolveTimezone(settings?.timezone));

  const queries = rows.map((row) => ({
    userId: user.id,
    occurredOn: row.occurredOn ?? today,
    amount: row.amount,
    currency: row.currency,
    kind: row.kind,
  }));
  const rates = await getRates()
    .then((r) => r.rates)
    .catch(() => null);
  const result = await findCrossSourceCandidates(queries, rates);

  return {
    ok: true,
    data: {
      candidates: result.map((entry, index) => ({
        index,
        matches: entry.matches.map(candidateMatchOf),
      })),
    },
  };
}
