"use client";

import { AmountInput } from "@/components/ui/amountInput";
import type { AmountPrecision } from "@/types/amount";
import { CurrencySelect } from "@/components/ui/currencySelect";
import { Label } from "@/components/ui/label";

interface AmountFieldBaseProps {
  id: string;
  label: React.ReactNode;
  value: string;
  onChange: (raw: string) => void;
  disabled?: boolean;
}

type AmountFieldProps = AmountFieldBaseProps & AmountPrecision;

interface AmountCurrencyFieldProps extends AmountFieldBaseProps {
  currency: string;
  onCurrencyChange: (value: string) => void;
  currencies: string[];
  currencyAriaLabel: string;
}

export function AmountField({
  id,
  label,
  value,
  onChange,
  disabled,
  ...precision
}: AmountFieldProps) {
  return (
    <div className="grid flex-1 gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <AmountInput
        id={id}
        placeholder="0"
        value={value}
        onChange={onChange}
        {...precision}
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
          currency={currency}
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
