"use client";


import { AmountCurrencyField } from "@/components/ui/amountCurrencyField";
import { DateField } from "@/components/ui/dateField";
import { DrawerActions } from "@/components/ui/drawerActions";
import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

import type { OpeningBalance } from "@/lib/openingBalance";

import { useOpeningBalanceForm } from "./useOpeningBalanceForm";

export function OpeningBalanceDialog({
  source,
  label,
  declared,
  openings,
  open,
  onOpenChange,
}: {
  source: string;
  label: string;
  declared: string[];
  openings: Record<string, OpeningBalance> | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useOpeningBalanceForm({
    source,
    declared,
    openings,
    onDone: () => onOpenChange(false),
  });

  return (
    <Drawer size="sm" open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader className="pb-2">
          <DrawerTitle>{label}</DrawerTitle>
          <DrawerDescription>
            Money you already had before tracking. Never counts as income.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <AmountCurrencyField
            id={`opening-${source}`}
            label="Opening balance"
            value={form.amount}
            onChange={form.setAmount}
            currency={form.currency}
            onCurrencyChange={form.setCurrency}
            currencies={form.currencies}
            currencyAriaLabel="Opening balance currency"
          />
          <DateField
            id={`opening-date-${source}`}
            label="Since (optional)"
            value={form.occurredOn}
            onChange={form.setOccurredOn}
            required={false}
          />
        </DrawerBody>
        <DrawerActions
          onCancel={() => onOpenChange(false)}
          onSubmit={form.submit}
          submitLabel="Save"
          pending={form.pending}
        />
      </DrawerContent>
    </Drawer>
  );
}
