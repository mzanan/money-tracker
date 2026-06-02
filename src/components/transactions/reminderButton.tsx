"use client";

import { BellPlusIcon } from "lucide-react";

import { computeNextDue } from "@/lib/reminders";

import { Button } from "@/components/ui/button";
import { ReminderForm } from "@/components/reminders/reminderForm";

import type { Transaction } from "@/types/db";

type Props = {
  tx: Transaction;
  defaultTitle: string;
};

export function ReminderButton({ tx, defaultTitle }: Props) {
  return (
    <ReminderForm
      title="Set a reminder"
      seed={{
        label: defaultTitle,
        amount: tx.amount_original,
        currency: tx.currency_original,
        category: tx.category,
        source: tx.source,
        frequency: "MONTHLY",
        lastPaidOn: tx.occurred_on,
        nextDueOn: computeNextDue(tx.occurred_on, "MONTHLY"),
      }}
      trigger={
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-foreground -mr-0.5"
          aria-label="Add reminder"
        >
          <BellPlusIcon />
        </Button>
      }
    />
  );
}
