"use client";

import { Loader2Icon } from "lucide-react";

import { AmountCurrencyField } from "@/components/ui/amountCurrencyField";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/dateField";
import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
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
        <DrawerFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button
            variant="ghost"
            className="sm:flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="sm:flex-1"
            disabled={form.pending}
            onClick={form.submit}
          >
            {form.pending && <Loader2Icon className="animate-spin" />}
            Save
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
