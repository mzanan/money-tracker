"use client";

import { useAmountInput } from "@/hooks/useAmountInput";
import { formatAmountDisplay } from "@/lib/currency";
import { cn } from "@/lib/utils";

import { Input } from "./input";

type InputProps = React.ComponentProps<typeof Input>;

interface AmountInputProps extends Omit<InputProps, "value" | "onChange"> {
  value: string;
  onChange: (raw: string) => void;
  decimals: number;
}

export function AmountInput({
  value,
  onChange,
  decimals,
  className,
  ...props
}: AmountInputProps) {
  const { ref, handleChange, handleKeyDown } = useAmountInput(
    value,
    onChange,
    decimals,
  );

  return (
    <Input
      ref={ref}
      inputMode="decimal"
      value={formatAmountDisplay(value)}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={cn("tabular-nums", className)}
      {...props}
    />
  );
}
