"use client";

import {
  AmountCurrencyField,
  AmountField,
} from "@/components/ui/amountCurrencyField";
import { DateField } from "@/components/ui/dateField";
import { getCurrency } from "@/lib/constants/currencies";
import type { PendingTransfer } from "@/lib/ledger/movements";

import type { useCreditTransfer } from "./useCreditTransfer";

export function CreditTransferFields({
  idPrefix,
  transfer,
  form,
}: {
  idPrefix: string;
  transfer: PendingTransfer;
  form: ReturnType<typeof useCreditTransfer>;
}) {
  return (
    <div className="grid gap-3">
      <DateField
        id={`${idPrefix}-credited-on`}
        label="Credited on"
        value={form.creditedOn}
        min={transfer.sentOn}
        onChange={form.setCreditedOn}
      />
      <AmountCurrencyField
        id={`${idPrefix}-received`}
        label="Amount received"
        value={form.receivedAmount}
        onChange={form.setReceivedAmount}
        currency={form.receivedCurrency}
        onCurrencyChange={form.setReceivedCurrency}
        currencies={form.currencies}
        currencyAriaLabel="Received currency"
      />
      <AmountField
        id={`${idPrefix}-fee`}
        label={`Destination fee (${form.receivedCurrency}, optional)`}
        value={form.fee}
        onChange={form.setFee}
        decimals={getCurrency(form.receivedCurrency).decimals}
      />
    </div>
  );
}
