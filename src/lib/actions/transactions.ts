"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { actionErrorMessage } from "@/lib/actionError";
import { trackActivation } from "@/lib/activation";
import { amountValidationError, feeAmountError } from "@/lib/currency";
import { db } from "@/lib/db";
import { ledger_transactions } from "@/lib/db/schema";
import {
  createTransactionSchema,
  updateTransactionSchema,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from "@/lib/schemas/transaction";
import {
  deleteLedgerTransactions,
  getLedgerRecord,
  getLedgerRecords,
  getScaleOf,
  postLedgerTransaction,
} from "@/lib/data/ledgerWrites";
import { getUser } from "@/lib/session";
import {
  MANUAL_SOURCE,
  kindOfSource,
  normalizeSource,
} from "@/lib/constants/sources";
import { dedupeTags } from "@/lib/tags";
import { BUDGET_MONTH_LOCK_ERROR } from "@/lib/budgetMonth";
import { feeLines, flowLines } from "@/lib/ledger/builders";
import {
  hasSyncedRef,
  isSyncedMovement,
  isTransferMovement,
  isWithdrawalMovement,
  legDate,
  withFlow,
  withLegDate,
  withSource,
} from "@/lib/ledger/edits";
import {
  primaryAssetLine,
  principalAssetLines,
  simpleFlow,
} from "@/lib/ledger/movements";
import { normalizeTags } from "@/lib/transactions";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function hasLedgerTransactions(userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: ledger_transactions.id })
    .from(ledger_transactions)
    .where(eq(ledger_transactions.user_id, userId))
    .limit(1);
  return rows.length > 0;
}

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid data",
    };
  }

  const amountError = amountValidationError(
    parsed.data.amount,
    parsed.data.currency,
  );
  if (amountError) {
    return { ok: false, error: amountError };
  }

  const fee = parsed.data.fee;
  if (fee !== undefined) {
    const feeError = feeAmountError(
      fee,
      parsed.data.currency,
      parsed.data.kind === "income" ? parsed.data.amount : undefined,
    );
    if (feeError) return { ok: false, error: feeError };
  }

  let source = MANUAL_SOURCE;
  if (parsed.data.source) {
    const normalized = normalizeSource(parsed.data.source);
    if (!normalized || kindOfSource(normalized) === "api") {
      return { ok: false, error: "Invalid source" };
    }
    source = normalized;
  }

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  try {
    const scaleOf = await getScaleOf();
    const { occurredOn, currency } = parsed.data;
    const lines = [
      ...flowLines({
        kind: parsed.data.kind,
        source,
        money: { amount: parsed.data.amount, currency },
        occurredOn,
        scaleOf,
      }),
      ...(fee === undefined
        ? []
        : feeLines(source, { amount: fee, currency }, occurredOn, scaleOf)),
    ];
    const firstEntry = !(await hasLedgerTransactions(user.id));
    const id = await postLedgerTransaction(user.id, {
      occurredOn,
      occurredAt: new Date().toISOString(),
      note: parsed.data.note?.trim() || null,
      comment: null,
      tags: normalizeTags(parsed.data.tags),
      recurringId: null,
      isFixed: null,
      budgetMonth: null,
      lines,
      externalRefs: [],
    });
    if (firstEntry) await trackActivation(user.id);
    revalidatePath("/", "layout");
    return { ok: true, data: { id } };
  } catch (error) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Insert failed"),
    };
  }
}

export async function updateTransaction(
  input: UpdateTransactionInput,
): Promise<ActionResult> {
  const parsed = updateTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid data",
    };
  }

  const amountError = amountValidationError(
    parsed.data.amount,
    parsed.data.currency,
  );
  if (amountError) {
    return { ok: false, error: amountError };
  }

  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  try {
    const record = await getLedgerRecord(user.id, parsed.data.id);
    if (!record) return { ok: false, error: "Transaction not found" };
    const { movement, draft } = record;
    const flow = simpleFlow(movement);
    const amountFieldsChanged = !principalAssetLines(movement).some(
      (line) =>
        Math.abs(line.amount) === parsed.data.amount &&
        line.currency === parsed.data.currency &&
        (line.amount < 0 ? "expense" : "income") === parsed.data.kind,
    );
    if (isTransferMovement(movement) && amountFieldsChanged) {
      return {
        ok: false,
        error: "Undo the transfer before editing amount, currency, or kind",
      };
    }
    if (isWithdrawalMovement(movement) && amountFieldsChanged) {
      return {
        ok: false,
        error: "Amount, currency and kind aren't editable on a withdrawal",
      };
    }
    if (isSyncedMovement(movement) && amountFieldsChanged) {
      return {
        ok: false,
        error:
          "Amount, currency and kind are synced automatically, not editable",
      };
    }
    if (!flow && amountFieldsChanged) {
      return {
        ok: false,
        error: "Amount, currency and kind aren't editable on this movement",
      };
    }
    const legSource = parsed.data.source
      ? (normalizeSource(parsed.data.source) ?? undefined)
      : undefined;
    const dateChanged = legDate(draft, legSource) !== parsed.data.occurredOn;
    if (draft.budgetMonth && dateChanged) {
      return { ok: false, error: BUDGET_MONTH_LOCK_ERROR };
    }

    const details = {
      ...draft,
      tags: normalizeTags(parsed.data.tags),
      note: parsed.data.note?.trim() || null,
    };
    const next =
      flow && amountFieldsChanged
        ? withFlow(
            details,
            {
              kind: parsed.data.kind,
              source: flow.source,
              money: {
                amount: parsed.data.amount,
                currency: parsed.data.currency,
              },
              occurredOn: parsed.data.occurredOn,
            },
            await getScaleOf(),
          )
        : dateChanged
          ? withLegDate(details, legSource, parsed.data.occurredOn)
          : details;
    await postLedgerTransaction(user.id, next, { replaceId: movement.id });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Update failed"),
    };
  }
}

export async function updateTransactionSource(
  id: string,
  source: string,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const normalized = normalizeSource(source);
  if (!normalized) return { ok: false, error: "Invalid account name" };
  if (kindOfSource(normalized) === "api") {
    return { ok: false, error: "Can't move into a synced account" };
  }

  try {
    const record = await getLedgerRecord(user.id, id);
    if (!record) return { ok: false, error: "Transaction not found" };
    const { movement, draft } = record;
    if (hasSyncedRef(movement)) {
      return { ok: false, error: "Synced transactions can't change account" };
    }
    if (isTransferMovement(movement)) {
      return { ok: false, error: "Undo the transfer before changing account" };
    }
    const current = primaryAssetLine(movement)?.key;
    if (!current) return { ok: false, error: "Transaction not found" };
    if (normalized === current) {
      return { ok: false, error: "Pick a different account" };
    }
    await postLedgerTransaction(
      user.id,
      withSource(draft, current, normalized),
      { replaceId: movement.id },
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

export async function setTransactionFixed(
  id: string,
  isFixed: boolean | null,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  if (isFixed !== null && typeof isFixed !== "boolean") {
    return { ok: false, error: "Invalid data" };
  }

  try {
    const record = await getLedgerRecord(user.id, id);
    if (!record) return { ok: false, error: "Transaction not found" };
    await postLedgerTransaction(
      user.id,
      { ...record.draft, isFixed },
      { replaceId: record.movement.id },
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

export async function mergeTransactions(
  keepId: string,
  removeId: string,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  if (keepId === removeId) {
    return { ok: false, error: "Pick two different transactions" };
  }

  try {
    const records = await getLedgerRecords(user.id, [keepId, removeId]);
    const keep = records.get(keepId);
    const removed = records.get(removeId);
    if (!keep || !removed) return { ok: false, error: "Transaction not found" };
    if (
      isTransferMovement(keep.movement) ||
      isTransferMovement(removed.movement)
    ) {
      return {
        ok: false,
        error: "Undo the transfer before merging this transaction",
      };
    }
    if (keep.draft.budgetMonth || removed.draft.budgetMonth) {
      return { ok: false, error: BUDGET_MONTH_LOCK_ERROR };
    }

    const preferRemovedDetails =
      isSyncedMovement(keep.movement) && !isSyncedMovement(removed.movement);
    const note =
      removed.draft.note && (preferRemovedDetails || !keep.draft.note)
        ? removed.draft.note
        : keep.draft.note;
    const tags = normalizeTags(
      preferRemovedDetails
        ? [...removed.draft.tags, ...keep.draft.tags]
        : [...keep.draft.tags, ...removed.draft.tags],
    );
    const removedFees = removed.draft.lines.filter(
      (line) => line.role === "fee",
    );

    await db.transaction(async (dbTx) => {
      await deleteLedgerTransactions(user.id, [removeId], dbTx);
      await postLedgerTransaction(
        user.id,
        {
          ...keep.draft,
          note,
          tags,
          comment: keep.draft.comment ?? removed.draft.comment,
          lines: [...keep.draft.lines, ...removedFees],
          externalRefs: [
            ...keep.draft.externalRefs,
            ...removed.draft.externalRefs,
          ],
        },
        { replaceId: keepId, executor: dbTx },
      );
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Merge failed"),
    };
  }
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  try {
    const record = await getLedgerRecord(user.id, id);
    if (!record) return { ok: false, error: "Transaction not found" };
    if (isTransferMovement(record.movement)) {
      return {
        ok: false,
        error: "Undo the transfer before deleting this transaction",
      };
    }
    if (isSyncedMovement(record.movement)) {
      return { ok: false, error: "Synced transactions can't be deleted" };
    }
    await deleteLedgerTransactions(user.id, [id]);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Delete failed"),
    };
  }
}

export async function getUsedTags(): Promise<ActionResult<string[]>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const rows = await db
    .select({ tags: ledger_transactions.tags })
    .from(ledger_transactions)
    .where(eq(ledger_transactions.user_id, user.id))
    .orderBy(desc(ledger_transactions.occurred_on));

  return { ok: true, data: dedupeTags(rows.flatMap((row) => row.tags)) };
}
