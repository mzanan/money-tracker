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
import { TagChip } from "@/components/ui/tagChip";

import { KindToggle } from "./kindToggle";
import { useTransactionForm, type TransactionSeed } from "./useTransactionForm";

export function TransactionFormDialog({
  seed,
  txId,
  open,
  onOpenChange,
  title,
  description: dialogDescription,
  submitLabel,
  successMessage,
  onCreated,
}: {
  seed: TransactionSeed;
  txId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  successMessage: string;
  onCreated?: (id: string) => void;
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
    tags,
    tagInput,
    setTagInput,
    tagSuggestions,
    addTag,
    removeTag,
    date,
    setDate,
    pending,
    submit,
  } = useTransactionForm({
    seed,
    txId,
    open,
    onOpenChange,
    successMessage,
    onCreated,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
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

          {!txId && (
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
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="duplicate-description">Description</Label>
            <Input
              id="duplicate-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={280}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="duplicate-tags">Tags</Label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <TagChip key={tag} tag={tag} onRemove={() => removeTag(tag)} />
                ))}
              </div>
            )}
            <Input
              id="duplicate-tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              placeholder="Add a tag…"
              maxLength={40}
            />
            {tagSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tagSuggestions.map((tag) => (
                  <TagChip key={tag} tag={tag} onSelect={() => addTag(tag)} />
                ))}
              </div>
            )}
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

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={
              pending || (!txId && (!source || sourceOptions === null))
            }
          >
            {pending && <Loader2Icon className="animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
