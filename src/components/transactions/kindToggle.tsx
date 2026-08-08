"use client";

import { cn } from "@/lib/utils";

export type Kind = "expense" | "income";

export function KindToggle({
  kind,
  onChange,
  disabled,
}: {
  kind: Kind;
  onChange: (kind: Kind) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Kind"
      aria-disabled={disabled}
      className={cn(
        "bg-surface-2 flex shrink-0 items-center rounded-xl p-1",
        disabled && "opacity-50",
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={kind === "expense"}
        disabled={disabled}
        onClick={() => onChange("expense")}
        className={cn(
          "flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed",
          kind === "expense"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-label="Expense"
      >
        Out
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={kind === "income"}
        disabled={disabled}
        onClick={() => onChange("income")}
        className={cn(
          "flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed",
          kind === "income"
            ? "bg-card text-income shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-label="Income"
      >
        In
      </button>
    </div>
  );
}
