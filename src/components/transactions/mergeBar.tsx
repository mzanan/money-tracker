"use client";

import { Loader2Icon } from "lucide-react";

import { transactionLabel } from "@/lib/transactions";
import { formatMoney } from "@/lib/currency";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { TappableRow } from "@/components/ui/tappableRow";

import { MarkPairTransferDialog } from "./markPairTransferDialog";
import { TransferBadge } from "./transferBadge";
import { useMergeBar } from "./useMergeBar";

export function MergeBar() {
  const {
    txSelectMode,
    selectedTxs,
    setTxSelectMode,
    choosing,
    setChoosing,
    markingTransfer,
    setMarkingTransfer,
    pending,
    canResolve,
    first,
    second,
    canMarkTransfer,
    expenseTx,
    incomeTx,
    keep,
  } = useMergeBar();

  if (!txSelectMode) return null;

  return (
    <>
      <div className="bg-background/95 border-border fixed inset-x-0 bottom-0 z-40 border-t px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            {canResolve
              ? "2 selected"
              : `${selectedTxs.length} selected, pick 2`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTxSelectMode(false)}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!canMarkTransfer || pending}
              onClick={() => setMarkingTransfer(true)}
            >
              Mark as transfer
            </Button>
            <Button
              size="sm"
              disabled={!canResolve || pending}
              onClick={() => setChoosing(true)}
            >
              {pending && <Loader2Icon className="animate-spin" />}
              Resolve duplicate
            </Button>
          </div>
        </div>
      </div>

      <Drawer open={choosing && canResolve} onOpenChange={setChoosing}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Which one do you keep?</DrawerTitle>
            <DrawerDescription className="sr-only">
              Keep one transaction; the other is removed and its details are
              preserved.
            </DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-2 px-4 pb-8">
            {canResolve &&
              [
                [first, second],
                [second, first],
              ].map(([keepTx, removeTx]) => (
                <TappableRow
                  key={keepTx.id}
                  type="button"
                  bordered
                  justify="between"
                  onClick={() => keep(keepTx, removeTx)}
                >
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="block truncate text-sm font-medium">
                        {transactionLabel(keepTx)}
                      </span>
                      {keepTx.transfer_group && <TransferBadge />}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {keepTx.occurred_on} · keeps this amount, the other one
                      is deleted and its details are preserved
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {keepTx.kind === "expense" ? "-" : "+"}
                    {formatMoney(keepTx.amount_original, keepTx.currency_original)}
                  </span>
                </TappableRow>
              ))}
            <Button
              variant="ghost"
              onClick={() => {
                setChoosing(false);
                setTxSelectMode(false);
              }}
            >
              Keep both, it&apos;s a repeated expense
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {canMarkTransfer && (
        <MarkPairTransferDialog
          open={markingTransfer}
          onOpenChange={setMarkingTransfer}
          expenseTx={expenseTx}
          incomeTx={incomeTx}
          onSuccess={() => {
            setMarkingTransfer(false);
            setTxSelectMode(false);
          }}
        />
      )}
    </>
  );
}
