"use client";

import { getCurrency } from "@/lib/constants/currencies";

import { AmountInput } from "@/components/ui/amountInput";
import { CurrencySelect } from "@/components/ui/currencySelect";
import { Label } from "@/components/ui/label";

interface AmountFieldProps {
  id: string;
  label: React.ReactNode;
  value: string;
  onChange: (raw: string) => void;
  decimals: number;
  disabled?: boolean;
}

interface AmountCurrencyFieldProps extends Omit<AmountFieldProps, "decimals"> {
  currency: string;
  onCurrencyChange: (value: string) => void;
  currencies: string[];
  currencyAriaLabel: string;
  decimals?: number;
}

export function AmountField({
  id,
  label,
  value,
  onChange,
  decimals,
  disabled,
}: AmountFieldProps) {
  return (
    <div className="grid flex-1 gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <AmountInput
        id={id}
        placeholder="0"
        value={value}
        onChange={onChange}
        decimals={decimals}
        disabled={disabled}
        className="bg-surface-2 h-9 border-none"
      />
    </div>
  );
}

export function AmountCurrencyField({
  id,
  label,
  value,
  onChange,
  currency,
  onCurrencyChange,
  currencies,
  currencyAriaLabel,
  decimals,
  disabled,
}: AmountCurrencyFieldProps) {
  return (
    <div className="grid flex-1 gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-1">
        <AmountInput
          id={id}
          placeholder="0"
          value={value}
          onChange={onChange}
          decimals={decimals ?? getCurrency(currency).decimals}
          disabled={disabled}
          className="bg-surface-2 h-9 border-none"
        />
        <CurrencySelect
          value={currency}
          onValueChange={onCurrencyChange}
          currencies={currencies}
          ariaLabel={currencyAriaLabel}
          className="bg-surface-2 h-9 w-[4.5rem] border-none text-xs"
        />
      </div>
    </div>
  );
}
