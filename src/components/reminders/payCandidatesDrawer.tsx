"use client";

import { labelForSource } from "@/lib/constants/sources";
import { formatMoney } from "@/lib/currency";
import type { ReminderPaymentCandidate } from "@/lib/actions/reminders";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export function PayCandidatesDrawer({
  candidates,
  onLink,
  onCreate,
  onClose,
}: {
  candidates: ReminderPaymentCandidate[] | null;
  onLink: (transactionId: string) => void;
  onCreate: () => void;
  onClose: () => void;
}) {
  return (
    <Drawer
      open={candidates !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Is this the payment?</DrawerTitle>
        </DrawerHeader>
        <div className="grid gap-2 px-4 pb-8">
          {candidates?.map((match) => (
            <button
              key={match.id}
              type="button"
              onClick={() => onLink(match.id)}
              className="hover:bg-surface-2/60 border-border flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {labelForSource(match.source)}
                  {match.note ? ` · ${match.note}` : ""}
                </span>
                <span className="text-muted-foreground block text-xs">
                  {match.occurredOn} · links the reminder, no new expense
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                -{formatMoney(match.amount, match.currency)}
              </span>
            </button>
          ))}
          <Button variant="ghost" onClick={onCreate}>
            None of these, create the expense
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
