"use client";

import { ClockIcon, HistoryIcon } from "lucide-react";

import { useServerAction } from "@/hooks/useServerAction";
import { useSettings } from "@/hooks/useSettings";
import { updateSettings } from "@/lib/actions/settings";
import { useUiStore } from "@/stores/uiStore";

import { Button } from "@/components/ui/button";
import { CurrencySelect } from "@/components/ui/currencySelect";

export function DisplayControls() {
  const settings = useSettings();
  const displayMode = useUiStore((state) => state.displayMode);
  const setDisplayMode = useUiStore((state) => state.setDisplayMode);
  const { run, pending } = useServerAction();

  function changeBase(code: string) {
    if (code === settings.base_currency) return;
    run(() =>
      updateSettings({
        currencies: settings.currencies,
        baseCurrency: code,
        timezone: settings.timezone,
      }),
    );
  }

  const isToday = displayMode === "today";

  if (settings.currencies.length < 2) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setDisplayMode(isToday ? "snapshot" : "today")}
        className="gap-1 text-xs"
        title={
          isToday
            ? "Recalculated at today's rate"
            : "Rates snapshotted when each transaction was added"
        }
      >
        {isToday ? (
          <ClockIcon className="size-3.5" />
        ) : (
          <HistoryIcon className="size-3.5" />
        )}
        {isToday ? "Today's rate" : "Snapshot"}
      </Button>
      <CurrencySelect
        value={settings.base_currency}
        onValueChange={changeBase}
        currencies={settings.currencies}
        disabled={pending}
        className="w-20"
        ariaLabel="Display currency"
      />
    </div>
  );
}
