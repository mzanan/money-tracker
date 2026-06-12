"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";

import { useServerAction } from "@/hooks/useServerAction";
import { mergeTransactions } from "@/lib/actions/transactions";
import { labelForSource } from "@/lib/constants/sources";
import { formatMoney } from "@/lib/currency";
import { useUiStore } from "@/stores/uiStore";
import type { Transaction } from "@/types/db";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

function txLabel(tx: Transaction): string {
  const detail = tx.note || tx.tags[0] || "";
  return detail
    ? `${labelForSource(tx.source)} · ${detail}`
    : labelForSource(tx.source);
}

export function MergeBar() {
  const txSelectMode = useUiStore((s) => s.txSelectMode);
  const selectedTxs = useUiStore((s) => s.selectedTxs);
  const setTxSelectMode = useUiStore((s) => s.setTxSelectMode);
  const [choosing, setChoosing] = useState(false);
  const { run, pending } = useServerAction();

  if (!txSelectMode) return null;

  const canResolve = selectedTxs.length === 2;
  const [first, second] = selectedTxs;

  function keep(keepTx: Transaction, removeTx: Transaction) {
    run(() => mergeTransactions(keepTx.id, removeTx.id), {
      success: "Unified into one transaction",
    });
    setChoosing(false);
    setTxSelectMode(false);
  }

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
          </DrawerHeader>
          <div className="grid gap-2 px-4 pb-8">
            {canResolve &&
              [
                [first, second],
                [second, first],
              ].map(([keepTx, removeTx]) => (
                <button
                  key={keepTx.id}
                  type="button"
                  onClick={() => keep(keepTx, removeTx)}
                  className="hover:bg-surface-2/60 border-border flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {txLabel(keepTx)}
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
                </button>
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
    </>
  );
}
