"use client";

import {
  CalendarDaysIcon,
  PiggyBankIcon,
  SlidersHorizontalIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BUDGET_ENABLED } from "@/lib/featureFlags";

import type { PanelMode } from "./useDashboardControls";

export function DashboardToolbar({
  panel,
  onToggle,
  activeFilters = 0,
}: {
  panel: PanelMode;
  onToggle: (mode: PanelMode) => void;
  activeFilters?: number;
}) {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        aria-pressed={panel === "filters"}
        onClick={() => onToggle("filters")}
      >
        <SlidersHorizontalIcon />
        Filters
        {activeFilters > 0 && (
          <Badge size="xs" aria-label={`${activeFilters} active`}>
            {activeFilters}
          </Badge>
        )}
      </Button>
      <Button
        variant="outline"
        size="sm"
        aria-pressed={panel === "calendar"}
        onClick={() => onToggle("calendar")}
      >
        <CalendarDaysIcon />
        Calendar
      </Button>
      {BUDGET_ENABLED && (
        <Button
          variant="outline"
          size="sm"
          aria-pressed={panel === "budget"}
          onClick={() => onToggle("budget")}
        >
          <PiggyBankIcon />
          Budget
        </Button>
      )}
    </div>
  );
}
