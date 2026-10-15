"use client";

import { useAmountInput } from "@/hooks/useAmountInput";
import { amountInputScale, formatAmountDisplay } from "@/lib/currency";
import type { AmountPrecision } from "@/types/amount";
import { cn, omitKeys } from "@/lib/utils";

import { Input } from "./input";

type InputProps = React.ComponentProps<typeof Input>;

type AmountInputProps = Omit<
  InputProps,
  "value" | "onChange" | "onKeyDown" | "ref" | "inputMode"
> & {
  value: string;
  onChange: (raw: string) => void;
} & AmountPrecision;

export function AmountInput({
  value,
  onChange,
  className,
  ...rest
}: AmountInputProps) {
  const props = omitKeys(rest, ["currency", "decimals"]);
  const { ref, handleChange, handleKeyDown } = useAmountInput(
    value,
    onChange,
    amountInputScale(rest),
  );

  return (
    <Input
      {...props}
      ref={ref}
      inputMode="decimal"
      value={formatAmountDisplay(value)}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={cn("tabular-nums", className)}
    />
  );
}
