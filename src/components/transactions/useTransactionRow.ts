"use client";

import { useAccountLabels } from "@/hooks/useAccountLabels";
import { useDeferredMenuAction } from "@/hooks/useDeferredMenuAction";
import { useDialogState } from "@/hooks/useDialogState";
import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import { deleteTransaction, setTransactionFixed } from "@/lib/actions/transactions";
import { unmarkTransfer } from "@/lib/actions/transfers";
import { kindOfSource, resolveSourceLabel } from "@/lib/constants/sources";
import { isSyncedExternalId } from "@/lib/externalIds";
import { isFixedTransaction } from "@/lib/fixedExpenses";
import { transactionInDisplay } from "@/lib/totals";
import { useUiStore } from "@/stores/uiStore";

import { useDrawerStep } from "./drawerStepContext";

import type { Transaction } from "@/types/db";

export function useTransactionRow(tx: Transaction) {
  const settings = useSettings();
  const accountLabels = useAccountLabels();
  const remove = useServerAction();
  const transfer = useServerAction();
  const fixedToggle = useServerAction();
  const runAfterMenuClose = useDeferredMenuAction();
  const stepApi = useDrawerStep();
  const reminder = useDialogState(runAfterMenuClose);
  const edit = useDialogState(runAfterMenuClose);
  const transferDialog = useDialogState(runAfterMenuClose);
  const source = useDialogState(runAfterMenuClose);
  const duplicate = useDialogState(runAfterMenuClose);

  const isTransfer = Boolean(tx.transfer_group);
  const isSynced = kindOfSource(tx.source) === "api";
  const canDelete = !isSynced && !isTransfer;
  const lockAmountFields = isSynced || isTransfer;
  const canChangeSource =
    !isTransfer && (!isSynced || !isSyncedExternalId(tx.external_id));

  const txSelectMode = useUiStore((s) => s.txSelectMode);
  const selectedTxs = useUiStore((s) => s.selectedTxs);
  const toggleTxSelected = useUiStore((s) => s.toggleTxSelected);
  const isSelected = selectedTxs.some((t) => t.id === tx.id);

  let inDisplay: number | null;
  try {
    inDisplay = transactionInDisplay(tx, settings.base_currency);
  } catch {
    inDisplay = null;
  }

  const sameAsBase = tx.currency_original === settings.base_currency;
  const sign = tx.kind === "income" ? "+" : "-";
  const showConverted = !sameAsBase && inDisplay !== null;
  const sourceLabel = resolveSourceLabel(tx.source, accountLabels);
  const avatarSeed = tx.tags[0] || sourceLabel;
  const reminderTitle = tx.tags[0] || sourceLabel;
  const description = tx.note?.trim();
  const resolvedFixed = isFixedTransaction(tx, settings.fixed_labels);

  function toggleSelected() {
    toggleTxSelected(tx);
  }

  function handleToggleFixed() {
    const next = !resolvedFixed;
    runAfterMenuClose(() =>
      fixedToggle.run(() => setTransactionFixed(tx.id, next), {
        success: next ? "Marked as fixed" : "Marked as variable",
      }),
    );
  }

  function handleUndoTransfer() {
    runAfterMenuClose(() =>
      transfer.run(() => unmarkTransfer(tx.id), {
        confirm: "Undo this transfer?",
        success: "Transfer undone",
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
    baseCurrency: settings.base_currency,
    txSelectMode,
    isSelected,
    toggleSelected,
    avatarSeed,
    description,
    isTransfer,
    sign,
    inDisplay,
    showConverted,
    sourceLabel,
    reminderTitle,
    canChangeSource,
    canDelete,
    lockAmountFields,
    resolvedFixed,
    reminder,
    edit,
    transferDialog,
    source,
    duplicate,
    handleUndoTransfer,
    handleDelete,
    handleToggleFixed,
    stepApi,
    runAfterMenuClose,
  };
}
