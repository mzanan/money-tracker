import { getCurrency } from "@/lib/constants/currencies";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CurrencySelect({
  value,
  onValueChange,
  currencies,
  showName = false,
  placeholder,
  disabled,
  id,
  className,
  ariaLabel,
}: {
  value: string | undefined;
  onValueChange: (value: string) => void;
  currencies: string[];
  showName?: boolean;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} className={className} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {currencies.map((code) => (
          <SelectItem key={code} value={code}>
            {showName ? `${getCurrency(code).code} — ${getCurrency(code).name}` : code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
