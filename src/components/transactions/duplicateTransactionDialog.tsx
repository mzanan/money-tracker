"use client";

import { Loader2Icon } from "lucide-react";

import { labelForSource } from "@/lib/constants/sources";

import { Button } from "@/components/ui/button";
import { CurrencySelect } from "@/components/ui/currencySelect";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { KindToggle } from "./kindToggle";
import { useDuplicateTransaction } from "./useDuplicateTransaction";

import type { Transaction } from "@/types/db";

export function DuplicateTransactionDialog({
  tx,
  open,
  onOpenChange,
}: {
  tx: Transaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    sourceOptions,
    kind,
    setKind,
    amount,
    setAmount,
    currency,
    setCurrency,
    currencies,
    source,
    setSource,
    description,
    setDescription,
    tagsInput,
    setTagsInput,
    date,
    setDate,
    pending,
    submit,
  } = useDuplicateTransaction({ tx, open, onOpenChange });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Duplicate transaction</DialogTitle>
          <DialogDescription>
            Creates a new transaction prefilled from this one.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex items-center gap-2">
            <KindToggle kind={kind} onChange={setKind} />
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="duplicate-amount">Amount</Label>
              <div className="flex items-center gap-1.5">
                <Input
                  id="duplicate-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value.replace(/[^\d.,]/g, ""))
                  }
                />
                <CurrencySelect
                  value={currency}
                  onValueChange={setCurrency}
                  currencies={currencies}
                  className="w-24"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="duplicate-source">Account</Label>
            {sourceOptions === null ? (
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2Icon className="size-4 animate-spin" /> Loading
                accounts…
              </p>
            ) : (
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger id="duplicate-source">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {labelForSource(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="duplicate-description">Description</Label>
            <Input
              id="duplicate-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={280}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="duplicate-tags">Tags</Label>
              <Input
                id="duplicate-tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="food, transport…"
                maxLength={120}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="duplicate-date">Date</Label>
              <Input
                id="duplicate-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={pending || !source || sourceOptions === null}
          >
            {pending && <Loader2Icon className="animate-spin" />}
            Duplicate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
