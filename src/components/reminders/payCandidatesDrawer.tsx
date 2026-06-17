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

function CandidateButton({
  match,
  onClick,
}: {
  match: ReminderPaymentCandidate;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
  );
}

export function PayCandidatesDrawer({
  open,
  label,
  suggested,
  recent,
  onLink,
  onCreate,
  onSkip,
  onClose,
}: {
  open: boolean;
  label: string;
  suggested: ReminderPaymentCandidate[];
  recent: ReminderPaymentCandidate[];
  onLink: (transactionId: string) => void;
  onCreate: () => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Mark {label} paid</DrawerTitle>
        </DrawerHeader>
        <div className="grid max-h-[60vh] gap-4 overflow-y-auto px-4 pb-8">
          {suggested.length > 0 && (
            <div className="grid gap-2">
              <span className="text-eyebrow">Likely this payment</span>
              {suggested.map((match) => (
                <CandidateButton
                  key={match.id}
                  match={match}
                  onClick={() => onLink(match.id)}
                />
              ))}
            </div>
          )}
          {recent.length > 0 && (
            <div className="grid gap-2">
              <span className="text-eyebrow">Link an existing expense</span>
              {recent.map((match) => (
                <CandidateButton
                  key={match.id}
                  match={match}
                  onClick={() => onLink(match.id)}
                />
              ))}
            </div>
          )}
          <div className="grid gap-2">
            <Button variant="outline" onClick={onCreate}>
              Create a new expense
            </Button>
            <Button variant="ghost" onClick={onSkip}>
              Just mark as paid, no expense
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
