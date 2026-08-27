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
  txKind = "expense",
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
  txKind?: "expense" | "income";
}) {
  const isIncome = txKind === "income";
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
        label={isIncome ? "Amount sent, optional" : "Amount received, optional"}
        value={receivedAmount}
        onChange={onReceivedAmountChange}
        currency={receivedCurrency}
        onCurrencyChange={onReceivedCurrencyChange}
        currencies={currencies}
        currencyAriaLabel={isIncome ? "Sent currency" : "Received currency"}
      />
      {preview && (
        <p className="text-muted-foreground text-sm">
          {isIncome ? "Sender sent" : "Recipient gets"}{" "}
          {formatMoney(preview.credited, preview.currency)}
          {preview.impliedRate !== null &&
            `, rate ${preview.impliedRate.toPrecision(6)}`}
        </p>
      )}
    </>
  );
}
