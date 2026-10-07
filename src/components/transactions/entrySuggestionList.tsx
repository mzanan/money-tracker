import type { ReactNode } from "react";

import { formatMoney, kindSign } from "@/lib/currency";
import type { EntrySuggestion } from "@/lib/entrySuggestions";

import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { TappableRow } from "@/components/ui/tappableRow";

export function EntrySuggestionList({
  suggestions,
  onSelect,
  children,
}: {
  suggestions: EntrySuggestion[];
  onSelect: (suggestion: EntrySuggestion) => void;
  children: ReactNode;
}) {
  return (
    <Popover open={suggestions.length > 0}>
      <PopoverAnchor asChild>
        <div className="min-w-0">{children}</div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className="w-(--radix-popover-trigger-width) gap-0 rounded-xl p-1"
      >
        <ul aria-label="Suggestions" className="grid min-w-0">
          {suggestions.map((suggestion) => (
            <li key={suggestion.key} className="min-w-0">
              <TappableRow
                type="button"
                justify="between"
                size="compact"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelect(suggestion)}
                className="w-full min-w-0 text-sm"
              >
                <span className="min-w-0 truncate">{suggestion.note}</span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {kindSign(suggestion.kind)}
                  {formatMoney(suggestion.amount, suggestion.currency)}
                </span>
              </TappableRow>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
