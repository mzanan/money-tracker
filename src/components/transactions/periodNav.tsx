"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PeriodNav({
  label,
  canPrev,
  canNext,
  onShift,
  prevLabel,
  nextLabel,
  tabular,
}: {
  label: string;
  canPrev: boolean;
  canNext: boolean;
  onShift: (delta: number) => void;
  prevLabel: string;
  nextLabel: string;
  tabular?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onShift(-1)}
        disabled={!canPrev}
        aria-label={prevLabel}
      >
        <ChevronLeftIcon />
      </Button>
      <span
        className={cn(
          "text-foreground min-w-[5.5rem] truncate text-center text-sm font-medium",
          tabular && "tabular-nums",
        )}
      >
        {label}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onShift(1)}
        disabled={!canNext}
        aria-label={nextLabel}
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );
}
