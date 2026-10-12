"use client";

import { useAccountCurrencies } from "@/hooks/useAccountCurrencies";
import { useAccountLabels } from "@/hooks/useAccountLabels";
import { useDeferredMenuAction } from "@/hooks/useDeferredMenuAction";
import { useDialogState } from "@/hooks/useDialogState";
import { useHideAmounts } from "@/hooks/useHideAmounts";
import { useServerAction } from "@/hooks/useServerAction";
import { useSettings, useTimezone } from "@/hooks/useSettings";
import {
  deleteTransaction,
  setTransactionFixed,
} from "@/lib/actions/transactions";
import { undoMoveWithdrawalToCash } from "@/lib/actions/cash";
import { setBudgetMonthShift, unmarkTransfer } from "@/lib/actions/transfers";
import { isAccountCurrency } from "@/lib/accountCurrencies";
import { canShiftBudgetMonth } from "@/lib/budgetMonth";
import { kindOfSource, resolveSourceLabel } from "@/lib/constants/sources";
import { legSign } from "@/lib/currency";
import { formatMonthShort, todayInTz } from "@/lib/dates";
import {
  isSingleLegWithdrawalExternalId,
  isSyncedExternalId,
  isWithdrawalExternalId,
} from "@/lib/externalIds";
import { isFixedTransaction } from "@/lib/fixedExpenses";
import { hasBudgetMonthOverride } from "@/lib/ledger/carriedOver";
import { exchangeSides, transferEnds } from "@/lib/ledger/movements";
import { rowFacts } from "@/lib/ledger/rowFacts";
import { isAllScope, movementAmount } from "@/lib/ledger/scope";
import { amountInCurrency } from "@/lib/ledger/valuation";
import {
  exchangeText,
  rowAmountTexts,
  transferLabel,
} from "@/lib/transactionDisplay";
import { useRatesByDate } from "@/hooks/useRatesByDate";
import { useUiStore } from "@/stores/uiStore";

import { useDrawerStep } from "./drawerStepContext";

import type { MovementScope } from "@/lib/ledger/scope";
import type { Movement } from "@/types/ledger";

const NO_RECURRING_NOTES = new Set<string>();

export function useTransactionRow(
  movement: Movement,
  scope: MovementScope,
  showDate = false,
  showBudgetMonthBadges = true,
  recurringNotes: Set<string> = NO_RECURRING_NOTES,
) {
  const settings = useSettings();
  const accountCurrencies = useAccountCurrencies();
  const timezone = useTimezone();
  const accountLabels = useAccountLabels();
  const ratesByDate = useRatesByDate();
  const tx = rowFacts(movement, scope);
  const remove = useServerAction();
  const transfer = useServerAction();
  const fixedToggle = useServerAction();
  const budgetMonthShift = useServerAction();
  const runAfterMenuClose = useDeferredMenuAction();
  const stepApi = useDrawerStep();
  const reminder = useDialogState(runAfterMenuClose);
  const edit = useDialogState(runAfterMenuClose);
  const transferDialog = useDialogState(runAfterMenuClose);
  const source = useDialogState(runAfterMenuClose);
  const duplicate = useDialogState(runAfterMenuClose);
  const moveToCash = useDialogState(runAfterMenuClose);

  const isTransfer = tx.isTransfer;
  const isWithdrawal = isWithdrawalExternalId(tx.externalId);
  const canMoveToCash =
    isSingleLegWithdrawalExternalId(tx.externalId) &&
    !isTransfer &&
    tx.kind === "expense";
  const canUndoMoveToCash = isWithdrawal && isTransfer;
  const isSynced = kindOfSource(tx.source) === "api";
  const canDelete = !isSynced && !isTransfer;
  const lockAmountFields = isSynced || isTransfer || isWithdrawal;
  const canChangeSource =
    !isTransfer && (!isSynced || !isSyncedExternalId(tx.externalId));
  const canShiftMonth =
    canShiftBudgetMonth(tx) || hasBudgetMonthOverride(movement);
  const realMonth = tx.occurredOn.slice(0, 7);
  const isMovedOut =
    showBudgetMonthBadges && !showDate && hasBudgetMonthOverride(movement);
  const isCarriedOver =
    showBudgetMonthBadges && showDate && hasBudgetMonthOverride(movement);
  const budgetMonthLabel = tx.budgetMonth
    ? `Move back to ${formatMonthShort(realMonth)}`
    : "Move to next month";

  const txSelectMode = useUiStore((s) => s.txSelectMode);
  const selectedTxs = useUiStore((s) => s.selectedTxs);
  const toggleTxSelected = useUiStore((s) => s.toggleTxSelected);
  const isSelected = selectedTxs.some((t) => t.id === tx.id);

  const shown = movementAmount(
    movement,
    scope,
    settings.base_currency,
    ratesByDate,
  );
  const inDisplay = amountInCurrency(
    shown,
    settings.base_currency,
    ratesByDate,
  );

  const sign = legSign(
    shown.kind,
    isAllScope(scope) ? movement.leg?.direction : undefined,
  );
  const { hideAmounts, mask } = useHideAmounts();
  const amounts = rowAmountTexts({
    amount: shown.amount,
    currency: shown.currency,
    baseAmount: inDisplay,
    baseCurrency: settings.base_currency,
    accountFirst: isAccountCurrency(
      accountCurrencies[tx.source],
      shown.currency,
    ),
  });
  const sides = exchangeSides(movement);
  const amountText = mask(
    sides ? exchangeText(sides) : `${sign}${amounts.primary}`,
  );
  const convertedText = hideAmounts || sides ? null : amounts.secondary;
  const ends = isAllScope(scope) ? transferEnds(movement) : null;
  const sourceLabel = ends
    ? transferLabel(ends, accountLabels, movement.leg?.direction)
    : resolveSourceLabel(tx.source, accountLabels);
  const avatarSeed = tx.tags[0] || sourceLabel;
  const reminderTitle = tx.tags[0] || sourceLabel;
  const description = tx.note?.trim();
  const resolvedFixed = isFixedTransaction(
    movement,
    settings.fixed_labels,
    recurringNotes,
  );

  const editSeed = {
    kind: tx.kind,
    amount: tx.amount,
    currency: tx.currency,
    source: tx.source,
    note: tx.note,
    tags: tx.tags,
    occurredOn: tx.occurredOn,
    transferGroup: tx.transferGroup,
    externalId: tx.externalId,
  };
  const duplicateSeed = { ...editSeed, occurredOn: todayInTz(timezone) };

  function toggleSelected() {
    toggleTxSelected(tx);
  }

  function handleToggleFixed() {
    const next = !resolvedFixed;
    runAfterMenuClose(() =>
      fixedToggle.run(() => setTransactionFixed(tx.id, next), {
        success: next ? "Marked as non-daily" : "Marked as daily",
      }),
    );
  }

  function handleUndoTransfer() {
    runAfterMenuClose(() =>
      transfer.run(() => unmarkTransfer(tx.id), {
        confirm: tx.budgetMonth
          ? `Undo this transfer? Its rows keep ${formatMonthShort(tx.budgetMonth)} as budget month and can be moved back individually.`
          : "Undo this transfer?",
        success: "Transfer undone",
      }),
    );
  }

  function handleUndoMoveToCash() {
    runAfterMenuClose(() =>
      transfer.run(() => undoMoveWithdrawalToCash(tx.id), {
        confirm:
          "Undo this? The cash entry is removed and the bank charge counts as spending again.",
        success: "Cash entry removed",
      }),
    );
  }

  function handleShiftBudgetMonth() {
    const next = tx.budgetMonth ? 0 : 1;
    const successMessage = next === 1 ? "Moved to next month" : "Moved back";
    runAfterMenuClose(() =>
      budgetMonthShift.run(() => setBudgetMonthShift(tx.id, next), {
        success: successMessage,
      }),
    );
  }

  function handleDelete() {
    runAfterMenuClose(() =>
      remove.run(() => deleteTransaction(tx.id), {
        confirm: "Delete this transaction?",
        success: "Deleted",
      }),
    );
  }

  return {
    tx,
    amountKind: shown.kind,
    txSelectMode,
    isSelected,
    toggleSelected,
    avatarSeed,
    description,
    isTransfer,
    isWithdrawal,
    amountText,
    convertedText,
    sourceLabel,
    reminderTitle,
    canChangeSource,
    canDelete,
    lockAmountFields,
    resolvedFixed,
    editSeed,
    duplicateSeed,
    reminder,
    edit,
    transferDialog,
    source,
    duplicate,
    moveToCash,
    canMoveToCash,
    canUndoMoveToCash,
    canShiftMonth,
    isMovedOut,
    isCarriedOver,
    budgetMonthLabel,
    handleUndoTransfer,
    handleUndoMoveToCash,
    handleDelete,
    handleToggleFixed,
    handleShiftBudgetMonth,
    stepApi,
    runAfterMenuClose,
  };
}
