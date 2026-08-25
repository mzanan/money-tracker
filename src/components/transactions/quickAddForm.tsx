"use client";

import { ChevronDownIcon, Loader2Icon, PlusIcon } from "lucide-react";

import { useAccountLabels } from "@/hooks/useAccountLabels";
import { getCurrency } from "@/lib/constants/currencies";
import { resolveSourceLabel } from "@/lib/constants/sources";
import { cn } from "@/lib/utils";

import { AmountInput } from "@/components/ui/amountInput";
import {
  AmountCurrencyField,
  AmountField,
} from "@/components/ui/amountCurrencyField";
import { Button } from "@/components/ui/button";
import { CurrencySelect } from "@/components/ui/currencySelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Surface } from "@/components/ui/surface";
import { Switch } from "@/components/ui/switch";

import { KindToggle } from "./kindToggle";
import { useQuickAddForm } from "./useQuickAddForm";

interface Props {
  recentTags: string[];
  source: string;
}

export function QuickAddForm({ recentTags, source }: Props) {
  const accountLabels = useAccountLabels();
  const resolvedSource = source === "all" ? "manual" : source;
  const {
    kind,
    setKind,
    amount,
    setAmount,
    currency,
    setCurrency,
    currencies,
    currencyMeta,
    numericAmount,
    preview,
    ratesPending,
    baseCurrency,
    showExtras,
    setShowExtras,
    withdrawal,
    setWithdrawal,
    withdrawalAvailable,
    withdrawalActive,
    withdrawalTotal,
    setWithdrawalTotal,
    withdrawalFee,
    setWithdrawalFee,
    withdrawalTotalFilled,
    chargedCurrency,
    setChargedCurrency,
    description,
    setDescription,
    tagsId,
    tagsInput,
    setTagsInput,
    date,
    setDate,
    pending,
    handleSubmit,
  } = useQuickAddForm(resolvedSource);

  return (
    <Surface asChild radius="lg" padding="sm" className="grid gap-3">
      <form id="quick-add" onSubmit={handleSubmit} className="scroll-mt-20">
        <p className="text-muted-foreground px-1 text-xs">
          Adding to{" "}
          <span className="text-foreground font-medium">
            {resolveSourceLabel(resolvedSource, accountLabels)}
          </span>
        </p>
        <div className="flex items-center gap-2">
          <KindToggle kind={kind} onChange={setKind} />
          <div className="bg-surface-2 relative flex flex-1 items-center rounded-xl pr-1.5">
            <span className="text-muted-foreground pointer-events-none absolute left-3 text-sm tabular-nums">
              {currencyMeta.symbol}
            </span>
            <AmountInput
              id="amount"
              autoComplete="off"
              placeholder="0"
              value={amount}
              onChange={setAmount}
              decimals={currencyMeta.decimals}
              aria-label="Amount"
              className="h-11 border-none bg-transparent pl-7 text-base focus-visible:ring-0"
              required
            />
            {currencies.length > 1 && (
              <CurrencySelect
                value={currency}
                onValueChange={setCurrency}
                currencies={currencies}
                ariaLabel="Currency"
                className="bg-background ml-1 h-8 w-[4.5rem] rounded-lg border-none text-xs"
              />
            )}
          </div>
          <Button
            type="submit"
            disabled={
              pending ||
              numericAmount === null ||
              (withdrawalActive && !withdrawalTotalFilled)
            }
            className="h-11 rounded-xl px-4"
          >
            {pending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
            Add
          </Button>
        </div>

        <Input
          id="description"
          autoComplete="off"
          placeholder="Description (coffee, rent, salary…)"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={120}
          aria-label="Description"
          className="bg-surface-2 h-9 rounded-xl border-none"
        />

        {!withdrawalActive &&
          (preview ||
            (currency !== baseCurrency &&
              ratesPending &&
              numericAmount !== null)) && (
            <div className="text-muted-foreground -mt-1 px-1 text-xs">
              {preview ? (
                <>
                  ≈ <span className="text-foreground">{preview}</span>{" "}
                  <span className="opacity-60">today&apos;s rate</span>
                </>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Loader2Icon className="size-3 animate-spin" /> Calculating…
                </span>
              )}
            </div>
          )}

        <button
          type="button"
          onClick={() => setShowExtras((value) => !value)}
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 px-1 text-xs transition-colors"
        >
          <ChevronDownIcon
            className={cn(
              "size-3 transition-transform",
              showExtras && "rotate-180",
            )}
          />
          {showExtras ? "Hide details" : "Add tags, date, withdrawal"}
        </button>

        {showExtras && (
          <div className="grid gap-2 px-1">
            <div className="grid gap-1.5">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                list={tagsId}
                placeholder="food, transport, rent…"
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                maxLength={120}
                className="bg-surface-2 h-9 border-none"
              />
              {recentTags.length > 0 && (
                <datalist id={tagsId}>
                  {recentTags.map((tag) => (
                    <option key={tag} value={tag} />
                  ))}
                </datalist>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
                className="bg-surface-2 h-9 border-none"
              />
            </div>

            {withdrawalAvailable && (
              <div className="flex items-center justify-between">
                <Label htmlFor="withdrawal-toggle">Withdrawal</Label>
                <Switch
                  id="withdrawal-toggle"
                  checked={withdrawal}
                  onCheckedChange={setWithdrawal}
                />
              </div>
            )}

            {withdrawalActive && (
              <>
                <div className="flex items-end gap-2">
                  <AmountCurrencyField
                    id="withdrawal-total"
                    label="Total charged"
                    value={withdrawalTotal}
                    onChange={setWithdrawalTotal}
                    currency={chargedCurrency}
                    onCurrencyChange={setChargedCurrency}
                    currencies={currencies}
                    currencyAriaLabel="Charged currency"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <AmountField
                    id="withdrawal-fee"
                    label="Fee (optional)"
                    value={withdrawalFee}
                    onChange={setWithdrawalFee}
                    decimals={getCurrency(chargedCurrency).decimals}
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  Books total minus fee on the account. Cash received goes in
                  the note.
                </p>
              </>
            )}
          </div>
        )}
      </form>
    </Surface>
  );
}
