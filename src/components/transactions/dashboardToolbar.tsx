"use client";

import {
  CalendarDaysIcon,
  PiggyBankIcon,
  PlusIcon,
  SlidersHorizontalIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BUDGET_ENABLED } from "@/lib/featureFlags";

import type { PanelMode } from "./useDashboardControls";

export function DashboardToolbar({
  panel,
  onToggle,
  canAdd,
}: {
  panel: PanelMode;
  onToggle: (mode: PanelMode) => void;
  canAdd: boolean;
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
      {canAdd && (
        <Button
          size="sm"
          aria-pressed={panel === "add"}
          onClick={() => onToggle("add")}
          className="ml-auto hidden lg:inline-flex"
        >
          <PlusIcon />
          Add
        </Button>
      )}
    </div>
  );
}
