"use client";

import { ChevronDownIcon } from "lucide-react";

import { accountCurrencySummary } from "@/lib/accountCurrencies";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountCurrenciesPicker({
  label,
  options,
  declared,
  suggested,
  disabled,
  onToggle,
}: {
  label: string;
  options: string[];
  declared: string[];
  suggested: string | null;
  disabled: boolean;
  onToggle: (code: string) => void;
}) {
  const showSuggestion = declared.length === 0 && suggested !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            disabled={disabled}
            aria-label={`${label} currencies`}
          >
            {accountCurrencySummary(declared)}
            <ChevronDownIcon />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {options.map((code) => (
          <DropdownMenuCheckboxItem
            key={code}
            checked={declared.includes(code)}
            disabled={disabled}
            onCheckedChange={() => onToggle(code)}
          >
            {showSuggestion && code === suggested
              ? `${code} · suggested`
              : code}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
