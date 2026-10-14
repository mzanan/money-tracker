import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function BalanceLine({
  label,
  value,
  positive,
  hint,
}: {
  label: string;
  value: string;
  positive: boolean;
  hint?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="grid justify-items-end">
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            positive ? "text-foreground" : "text-expense",
          )}
        >
          {value}
        </span>
        {hint}
      </span>
    </div>
  );
}
