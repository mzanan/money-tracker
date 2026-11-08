"use client";

import { Loader2Icon } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACCOUNT_PURPOSE_LABELS,
  ACCOUNT_PURPOSES,
} from "@/lib/constants/accountPurposes";
import {
  NO_PURPOSE,
  type HeldAccount,
  type PurposeChoice,
} from "@/lib/accountPurpose";

import { useAccountPurposeForm } from "./useAccountPurposeForm";

export function AccountPurposeDialog({
  source,
  label,
  held,
  open,
  onOpenChange,
}: {
  source: string;
  label: string;
  held: HeldAccount | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useAccountPurposeForm({
    source,
    held,
    onDone: () => onOpenChange(false),
  });

  return (
    <Drawer size="sm" open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader className="pb-2">
          <DrawerTitle>{label}</DrawerTitle>
          <DrawerDescription>
            Deposits and loans count as yours but stay out of your available
            balance.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <div className="grid gap-1.5">
            <Label htmlFor={`purpose-${source}`}>Purpose</Label>
            <Select
              value={form.choice}
              onValueChange={(value) => form.setChoice(value as PurposeChoice)}
            >
              <SelectTrigger
                id={`purpose-${source}`}
                className="bg-surface-2 h-9 w-full border-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PURPOSE}>Spendable account</SelectItem>
                {ACCOUNT_PURPOSES.map((purpose) => (
                  <SelectItem key={purpose} value={purpose}>
                    {ACCOUNT_PURPOSE_LABELS[purpose]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.showDate && (
            <DateField
              id={`expected-${source}`}
              label="Expected back (optional)"
              value={form.expectedOn}
              onChange={form.setExpectedOn}
              required={false}
            />
          )}
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
