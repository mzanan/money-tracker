"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClockIcon, HistoryIcon } from "lucide-react";

import { useSettings } from "@/hooks/useSettings";
import { updateSettings } from "@/lib/actions/settings";
import { useUiStore } from "@/stores/uiStore";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DisplayControls() {
  const router = useRouter();
  const settings = useSettings();
  const displayMode = useUiStore((state) => state.displayMode);
  const setDisplayMode = useUiStore((state) => state.setDisplayMode);
  const [pending, startTransition] = useTransition();

  function changeBase(code: string) {
    if (code === settings.base_currency) return;
    startTransition(async () => {
      const result = await updateSettings({
        currencies: settings.currencies,
        baseCurrency: code,
        timezone: settings.timezone,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
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
      <Select
        value={settings.base_currency}
        onValueChange={changeBase}
        disabled={pending}
      >
        <SelectTrigger className="w-20" aria-label="Display currency">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {settings.currencies.map((code) => (
            <SelectItem key={code} value={code}>
              {code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
