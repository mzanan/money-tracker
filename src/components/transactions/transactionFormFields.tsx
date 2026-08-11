"use client";

import { AccountSelect } from "./accountSelect";
import { AmountInput } from "@/components/ui/amountInput";
import { CurrencySelect } from "@/components/ui/currencySelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagChip } from "@/components/ui/tagChip";
import { Textarea } from "@/components/ui/textarea";
import { getCurrency } from "@/lib/constants/currencies";

import { KindToggle } from "./kindToggle";
import type { useTransactionForm } from "./useTransactionForm";

type TransactionFormState = ReturnType<typeof useTransactionForm>;

export function TransactionFormFields({
  form,
  txId,
  locked,
}: {
  form: TransactionFormState;
  txId?: string;
  locked?: boolean;
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
    tagLimitReached,
    addTag,
    removeTag,
    date,
    setDate,
  } = form;

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
          <KindToggle kind={kind} onChange={setKind} disabled={locked} />
          <div className="grid flex-1 gap-1.5">
            <Label htmlFor="tx-form-amount">Amount</Label>
            <div className="flex items-center gap-1.5">
              <AmountInput
                id="tx-form-amount"
                value={amount}
                onChange={setAmount}
                decimals={getCurrency(currency).decimals}
                disabled={locked}
              />
              <CurrencySelect
                value={currency}
                onValueChange={setCurrency}
                currencies={currencies}
                className="w-24"
                disabled={locked}
              />
            </div>
          </div>
        </div>
        {locked && (
          <p className="text-muted-foreground -mt-2 text-xs">
            Amount, currency and kind aren&apos;t editable here (synced or
            transfer transaction).
          </p>
        )}

        {!txId && (
          <div className="grid gap-1.5">
            <Label htmlFor="tx-form-source">Account</Label>
            <AccountSelect
              id="tx-form-source"
              sources={sourceOptions}
              value={source}
              onValueChange={setSource}
            />
          </div>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="tx-form-description">Description</Label>
          <Textarea
            id="tx-form-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={280}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="tx-form-tags">
            Tags{tagLimitReached && " (max 10)"}
          </Label>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <TagChip key={tag} tag={tag} onRemove={() => removeTag(tag)} />
              ))}
            </div>
          )}
          <Input
            id="tx-form-tags"
            value={tagInput}
            disabled={tagLimitReached}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(tagInput);
              }
            }}
            placeholder={tagLimitReached ? "Max 10 tags" : "Add a tag…"}
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
          <Label htmlFor="tx-form-date">Date</Label>
          <Input
            id="tx-form-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
    </div>
  );
}
