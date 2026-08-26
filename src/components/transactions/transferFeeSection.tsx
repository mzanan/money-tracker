"use client";

import { AmountCurrencyField } from "@/components/ui/amountCurrencyField";
import { formatMoney } from "@/lib/currency";

import { TransferFeeFields } from "./transferFeeFields";

import type { FeeDraft } from "./transferFeeFields";
import type { CreditedPreview } from "@/lib/transfer";

export function TransferFeeSection({
  idPrefix,
  fees,
  onFeesChange,
  sourceCurrency,
  destinationCurrency,
  currencies,
  receivedAmount,
  onReceivedAmountChange,
  receivedCurrency,
  onReceivedCurrencyChange,
  preview,
}: {
  idPrefix: string;
  fees: FeeDraft[];
  onFeesChange: (fees: FeeDraft[]) => void;
  sourceCurrency: string;
  destinationCurrency: string;
  currencies: string[];
  receivedAmount: string;
  onReceivedAmountChange: (value: string) => void;
  receivedCurrency: string;
  onReceivedCurrencyChange: (value: string) => void;
  preview: CreditedPreview | null;
}) {
  return (
    <>
      <TransferFeeFields
        idPrefix={idPrefix}
        fees={fees}
        onChange={onFeesChange}
        sourceCurrency={sourceCurrency}
        destinationCurrency={destinationCurrency}
      />
      <AmountCurrencyField
        id={`${idPrefix}-received`}
        label="Amount received, optional"
        value={receivedAmount}
        onChange={onReceivedAmountChange}
        currency={receivedCurrency}
        onCurrencyChange={onReceivedCurrencyChange}
        currencies={currencies}
        currencyAriaLabel="Received currency"
      />
      {preview && (
        <p className="text-muted-foreground text-sm">
          Recipient gets {formatMoney(preview.credited, preview.currency)}
          {preview.impliedRate !== null &&
            `, rate ${preview.impliedRate.toPrecision(6)}`}
        </p>
      )}
    </>
  );
}
