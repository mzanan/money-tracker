"use client";

import { ChevronDownIcon, Loader2Icon, PlusIcon } from "lucide-react";

import { useAccountLabels } from "@/hooks/useAccountLabels";
import { getCurrency } from "@/lib/constants/currencies";
import { resolveSourceLabel } from "@/lib/constants/sources";
import type { EntrySuggestion } from "@/lib/entrySuggestions";
import { cn } from "@/lib/utils";

import { AmountInput } from "@/components/ui/amountInput";
import {
  AmountCurrencyField,
  AmountField,
} from "@/components/ui/amountCurrencyField";
import { Button } from "@/components/ui/button";
import { RateEstimate } from "@/components/ui/rateEstimate";
import { CurrencySelect } from "@/components/ui/currencySelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SwitchRow } from "@/components/ui/switchRow";

import { AccountSelect } from "./accountSelect";
import { EntrySuggestionList } from "./entrySuggestionList";
import { KindToggle } from "./kindToggle";
import { TransferFeeSection } from "./transferFeeSection";
import { useQuickAddForm } from "./useQuickAddForm";

interface Props {
  recentTags: string[];
  entrySuggestions: EntrySuggestion[];
  source: string;
  onAdded?: () => void;
  autoFocusAmount?: boolean;
  accountOptions?: string[];
  onSourceChange?: (source: string) => void;
}

export function QuickAddForm({
  recentTags,
  entrySuggestions,
  source,
  onAdded,
  autoFocusAmount = false,
  accountOptions = [],
  onSourceChange,
}: Props) {
  const accountLabels = useAccountLabels();
  const {
    extrasLabel,
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
    ratesStale,
    baseCurrency,
    showExtras,
    transfer,
    setTransfer,
    transferAvailable,
    transferActive,
    transferSources,
    transferDestination,
    setTransferDestination,
    transferFees,
    setTransferFees,
    receivedAmount,
    setReceivedAmount,
    receivedCurrency,
    transferReceivedRequired,
    setReceivedCurrency,
    destinationCurrency,
    transferPreview,
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
    suggestions,
    applySuggestion,
    descriptionHandlers,
    tagsId,
    formId,
    tagsInput,
    setTagsInput,
    fee,
    setFee,
    feeAvailable,
    date,
    setDate,
    pending,
    handleSubmit,
  } = useQuickAddForm({
    source,
    onAdded,
    entrySuggestions,
    accountOptions,
    onSourceChange,
  });

  const submitButton = (
    <Button
      type="submit"
      disabled={
        pending ||
        numericAmount === null ||
        (withdrawalActive && !withdrawalTotalFilled) ||
        (transferActive && !transferDestination)
      }
      className="h-11 w-full rounded-xl px-4"
    >
      {pending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
      Add
    </Button>
  );

  return (
    <form id={formId} onSubmit={handleSubmit} className="grid gap-3">
      {accountOptions.length > 1 && onSourceChange ? (
        <div className="flex items-center gap-2 px-1">
          <Label
            htmlFor={`${formId}-account`}
            className="text-muted-foreground text-xs font-normal"
          >
            Adding to
          </Label>
          <AccountSelect
            id={`${formId}-account`}
            size="sm"
            sources={accountOptions}
            value={source}
            onValueChange={onSourceChange}
          />
        </div>
      ) : (
        <p className="text-muted-foreground px-1 text-xs">
          Adding to{" "}
          <span className="text-foreground font-medium">
            {resolveSourceLabel(source, accountLabels)}
          </span>
        </p>
      )}
      <div className="flex items-center gap-2">
        <KindToggle kind={kind} onChange={setKind} />
        <div className="bg-surface-2 flex min-w-0 flex-1 items-center rounded-xl pr-1.5">
          <label
            htmlFor={`${formId}-amount`}
            className="text-muted-foreground shrink-0 pl-3 text-sm whitespace-nowrap tabular-nums"
          >
            {currencyMeta.symbol.trim()}
          </label>
          <AmountInput
            id={`${formId}-amount`}
            data-autofocus={autoFocusAmount || undefined}
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={setAmount}
            decimals={currencyMeta.decimals}
            aria-label="Amount"
            className="h-11 min-w-0 border-none bg-transparent pl-1.5 text-base focus-visible:ring-0"
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
      </div>

      <EntrySuggestionList suggestions={suggestions} onSelect={applySuggestion}>
        <Input
          id={`${formId}-description`}
          autoComplete="off"
          placeholder="Description (coffee, rent, salary…)"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          {...descriptionHandlers}
          maxLength={120}
          aria-label="Description"
          className="bg-surface-2 h-9 rounded-xl border-none"
        />
      </EntrySuggestionList>

      {submitButton}

      {!withdrawalActive &&
        !transferActive &&
        (preview ||
          (currency !== baseCurrency &&
            ratesPending &&
            numericAmount !== null)) && (
          <div className="text-muted-foreground -mt-1 px-1 text-xs">
            {preview ? (
              <RateEstimate value={preview} stale={ratesStale} emphasis />
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
        {showExtras ? "Hide details" : extrasLabel}
      </button>

      {showExtras && (
        <div className="grid gap-2 px-1">
          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-tags`}>Tags</Label>
            <Input
              id={`${formId}-tags`}
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
            <Label htmlFor={`${formId}-date`}>Date</Label>
            <Input
              id={`${formId}-date`}
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
              className="bg-surface-2 h-9 border-none"
            />
          </div>

          {feeAvailable && (
            <AmountField
              id={`${formId}-fee`}
              label="Fee (optional)"
              value={fee}
              onChange={setFee}
              decimals={currencyMeta.decimals}
            />
          )}

          {transferAvailable && (
            <SwitchRow
              id={`${formId}-transfer-toggle`}
              label="Transfer"
              checked={transfer}
              onCheckedChange={setTransfer}
            />
          )}

          {transferActive && (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor={`${formId}-transfer-destination`}>
                  To account
                </Label>
                <AccountSelect
                  id={`${formId}-transfer-destination`}
                  sources={transferSources}
                  value={transferDestination}
                  onValueChange={setTransferDestination}
                  emptyMessage="No other account to pick. Import or add one first."
                />
              </div>
              <TransferFeeSection
                idPrefix={`${formId}-transfer`}
                fees={transferFees}
                onFeesChange={setTransferFees}
                sourceCurrency={currency}
                destinationCurrency={destinationCurrency}
                currencies={currencies}
                receivedAmount={receivedAmount}
                onReceivedAmountChange={setReceivedAmount}
                receivedCurrency={receivedCurrency}
                receivedRequired={transferReceivedRequired}
                onReceivedCurrencyChange={setReceivedCurrency}
                preview={transferPreview}
              />
            </>
          )}

          {withdrawalAvailable && (
            <SwitchRow
              id={`${formId}-withdrawal-toggle`}
              label="Withdrawal"
              checked={withdrawal}
              onCheckedChange={setWithdrawal}
            />
          )}

          {withdrawalActive && (
            <>
              <AmountCurrencyField
                id={`${formId}-withdrawal-total`}
                label="Total charged"
                value={withdrawalTotal}
                onChange={setWithdrawalTotal}
                currency={chargedCurrency}
                onCurrencyChange={setChargedCurrency}
                currencies={currencies}
                currencyAriaLabel="Charged currency"
              />
              <AmountField
                id={`${formId}-withdrawal-fee`}
                label="Fee (optional)"
                value={withdrawalFee}
                onChange={setWithdrawalFee}
                decimals={getCurrency(chargedCurrency).decimals}
              />
              <p className="text-muted-foreground text-xs">
                Books total minus fee on the account. Cash received goes in the
                note.
              </p>
            </>
          )}
        </div>
      )}
    </form>
  );
}
