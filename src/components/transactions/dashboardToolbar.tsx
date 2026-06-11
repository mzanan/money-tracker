"use client";

import {
  CalendarDaysIcon,
  PiggyBankIcon,
  SlidersHorizontalIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import type { PanelMode } from "./useDashboardControls";

export function DashboardToolbar({
  panel,
  onToggle,
}: {
  panel: PanelMode;
  onToggle: (mode: PanelMode) => void;
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
      <Button
        variant="outline"
        size="sm"
        aria-pressed={panel === "budget"}
        onClick={() => onToggle("budget")}
      >
        <PiggyBankIcon />
        Budget
      </Button>
    </div>
  );
}
